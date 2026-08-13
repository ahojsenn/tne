#!/bin/bash
# One-time (and occasional) server setup for the tne deploy pipeline.
#
# Run this ON THE SERVER, as hannes, from a copy of this repo's ubuntuserver/
# directory. It is idempotent — re-run it whenever tne.service, the nginx
# config, or release.sh changes, since those are deliberately NOT part of a
# normal deploy.
#
#   scp -r ubuntuserver hannes@konfi.kommitment.works:/tmp/
#   ssh hannes@konfi.kommitment.works 'bash /tmp/ubuntuserver/bootstrap.sh'
#
# Options:
#   --nginx              accepted for compatibility; nginx is always installed
#   --deploy-key FILE    append a public key to ~/.ssh/authorized_keys (for CI)
#   --no-seed            skip seeding the first release from the old layout
#   --yes                don't prompt before restarting the service
#
# What it does, in order: create the release layout, move the existing .env to
# shared/, install release.sh, seed release 0 from the currently-running build
# so `current` is valid BEFORE the unit changes, install the sudoers grant and
# the new unit, then restart and verify. The old /home/hannes/tomatoes-and-eggs
# directory is left untouched so the cutover stays reversible.
set -euo pipefail

ROOT=/home/hannes/tne
OLD_APP=/home/hannes/tomatoes-and-eggs
RELEASES=$ROOT/releases
SHARED=$ROOT/shared
SERVICE=tne.service
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

DO_NGINX=0
DEPLOY_KEY=""
DO_SEED=1
ASSUME_YES=0
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    # Accepted but ignored: the nginx config is always installed now, because
    # its proxy target has to stay in step with the address the app binds.
    --nginx)      DO_NGINX=1 ;;
    --deploy-key) shift; DEPLOY_KEY=${1:-} ;;
    --no-seed)    DO_SEED=0 ;;
    --yes|-y)     ASSUME_YES=1 ;;
    --dry-run|-n) DRY_RUN=1 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

log()  { echo "[bootstrap] $*"; }
fail() { echo "[bootstrap] ❌ $*" >&2; exit 1; }

# Every state-changing command goes through run(), so --dry-run can print the
# exact sequence — including the sudo calls — against the real server without
# touching it. Read-only inspection still happens for real, so a dry run tells
# you which branches this box would actually take.
run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}
# A precondition that only holds after an earlier run() has really executed
# cannot be enforced during a dry run.
require() {
  if [ "$DRY_RUN" = "1" ]; then
    log "(dry-run) would check: $1"
  else
    eval "$1" || fail "$2"
  fi
}

[ "$(id -un)" = "hannes" ] || fail "run this as hannes, not $(id -un)"
[ -f "$SRC/release.sh" ] || fail "release.sh not found next to this script (copy the whole ubuntuserver/ dir)"

if [ "$DRY_RUN" = "1" ]; then
  log "DRY RUN — nothing will be changed"
else
  log "This will restart $SERVICE on production."
  if [ "$ASSUME_YES" != "1" ]; then
    printf "Continue? [y/N] "
    read -r reply
    case "$reply" in y|Y|yes|YES) ;; *) fail "aborted" ;; esac
  fi
fi

# ---------------------------------------------------------------- layout
log "creating layout under $ROOT"
run mkdir -p "$RELEASES" "$SHARED" "$ROOT/bin" "$ROOT/incoming"

# ---------------------------------------------------------------- secrets
# One copy of production secrets on the box, owned by hannes, mode 600.
# Previously this lived world-readable (644) inside the app directory and was
# overwritten by whoever deployed last from their laptop.
if [ ! -f "$SHARED/.env" ]; then
  if [ -f "$OLD_APP/.env" ]; then
    log "migrating $OLD_APP/.env -> $SHARED/.env"
    run cp "$OLD_APP/.env" "$SHARED/.env"
  elif [ -f "$ROOT/.env" ]; then
    log "migrating $ROOT/.env -> $SHARED/.env"
    run mv "$ROOT/.env" "$SHARED/.env"
  else
    fail "no existing .env found — create $SHARED/.env by hand (see .env.example) and re-run"
  fi
fi
run chmod 600 "$SHARED/.env"
if [ -f "$SHARED/.env" ]; then
  log "$SHARED/.env present ($(grep -cE '^[A-Za-z_]+=' "$SHARED/.env") keys, mode $(stat -c %a "$SHARED/.env"))"
fi

# ---------------------------------------------------------------- release.sh
log "installing $ROOT/bin/release.sh"
run install -m 755 "$SRC/release.sh" "$ROOT/bin/release.sh"

# ---------------------------------------------------------------- seed release
# The new unit points at $ROOT/current, so a valid release must exist before we
# install it — otherwise the restart fails and the site goes down.
if [ ! -L "$ROOT/current" ] && [ "$DO_SEED" = "1" ]; then
  seed_src=""
  if [ -d "$OLD_APP/.output" ]; then seed_src=$OLD_APP
  elif [ -d "$ROOT/.output" ];   then seed_src=$ROOT
  fi
  [ -n "$seed_src" ] || fail "no existing .output to seed from; deploy a release first or pass --no-seed"

  seed_id="$(date -u +%Y%m%dT%H%M%SZ)-bootstrap"
  log "seeding first release $seed_id from $seed_src/.output"
  run mkdir -p "$RELEASES/$seed_id"
  run cp -a "$seed_src/.output" "$RELEASES/$seed_id/.output"
  run cp -a "$SRC" "$RELEASES/$seed_id/ubuntuserver"
  run ln -sfn ../../shared/.env "$RELEASES/$seed_id/.env"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] write $RELEASES/$seed_id/RELEASE_INFO"
  else
    printf 'release=%s\nsource=seeded by bootstrap.sh from %s\n' "$seed_id" "$seed_src" \
      > "$RELEASES/$seed_id/RELEASE_INFO"
  fi
  run ln -sfn "$RELEASES/$seed_id" "$ROOT/current.tmp"
  run mv -T "$ROOT/current.tmp" "$ROOT/current"
  log "current -> releases/$seed_id"
fi
require '[ -L "$ROOT/current" ]' "$ROOT/current does not exist — cannot install a unit that points at it"

# ---------------------------------------------------------------- sudoers
# Validate before installing: a malformed sudoers file can lock out sudo
# entirely, so visudo -c the candidate first and never write it unchecked.
log "installing /etc/sudoers.d/tne-deploy"
run sudo install -m 0440 -o root -g root "$SRC/tne-deploy.sudoers" /etc/sudoers.d/tne-deploy.new
if [ "$DRY_RUN" != "1" ]; then
  sudo visudo -cf /etc/sudoers.d/tne-deploy.new \
    || { sudo rm -f /etc/sudoers.d/tne-deploy.new; fail "sudoers file failed validation — not installed"; }
else
  echo "[dry-run] sudo visudo -cf /etc/sudoers.d/tne-deploy.new  (abort if invalid)"
fi
run sudo mv /etc/sudoers.d/tne-deploy.new /etc/sudoers.d/tne-deploy
log "sudoers grant installed"

# ---------------------------------------------------------------- journal size
# Cap the journal so it cannot creep up to systemd's implicit 10%-of-disk
# default. Restarting journald applies the new ceiling; the explicit vacuum
# makes it take effect now rather than at the next rotation.
log "capping the system journal at 500M"
run sudo mkdir -p /etc/systemd/journald.conf.d
run sudo install -m 644 -o root -g root "$SRC/journald-tne.conf" /etc/systemd/journald.conf.d/tne.conf
run sudo systemctl restart systemd-journald
run sudo journalctl --vacuum-size=500M

# ---------------------------------------------------------------- journal access
# The unit logs to journald, and reading another user's unit journal requires
# adm or systemd-journal membership. Without this, `journalctl -u tne.service`
# silently shows nothing and the rollback path has no diagnostics to print.
if id -nG "$(id -un)" | tr ' ' '\n' | grep -qx 'systemd-journal'; then
  log "journal access already granted"
else
  log "adding $(id -un) to the systemd-journal group (needed to read the unit journal)"
  run sudo usermod -aG systemd-journal "$(id -un)"
  # Group membership is applied at login, so this session still cannot read it.
  log "NOTE: log in again for journal access to take effect in your shell"
fi

# ---------------------------------------------------------------- nginx
# Before the service restart, and no longer behind --nginx. The unit binds the
# app to 127.0.0.1, so nginx must already be pointing at that exact address
# when the app rebinds; the other way round leaves a window where the proxy
# cannot reach it. Installing is idempotent and gated by `nginx -t`, so doing
# it on every run costs nothing.
log "installing nginx site config"
run sudo install -m 644 -o root -g root "$SRC/nginx-tne.conf" /etc/nginx/sites-available/tne.conf
run sudo ln -sfn /etc/nginx/sites-available/tne.conf /etc/nginx/sites-enabled/tne.conf
run sudo nginx -t
run sudo systemctl reload nginx

# Belt and braces only: the app no longer listens on a public interface, so
# this is not what keeps port 3000 private. Tolerated failure — ufw may be
# inactive on this box, which is not a reason to abort a bootstrap.
run sudo ufw deny 3000 || true

# ---------------------------------------------------------------- systemd
log "installing $SERVICE"
run sudo install -m 644 -o root -g root "$SRC/tne.service" "/etc/systemd/system/$SERVICE"
# Required after touching a unit file — systemd otherwise keeps serving its
# cached copy and the edit silently never takes effect.
run sudo systemctl daemon-reload
run sudo systemctl enable "$SERVICE"
run sudo systemctl restart "$SERVICE"

# ---------------------------------------------------------------- deploy key
if [ -n "$DEPLOY_KEY" ]; then
  [ -f "$DEPLOY_KEY" ] || fail "deploy key file not found: $DEPLOY_KEY"
  run mkdir -p ~/.ssh
  run chmod 700 ~/.ssh
  run touch ~/.ssh/authorized_keys
  run chmod 600 ~/.ssh/authorized_keys
  if grep -qFf "$DEPLOY_KEY" ~/.ssh/authorized_keys 2>/dev/null; then
    log "deploy key already present in authorized_keys"
  elif [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] append $DEPLOY_KEY to ~/.ssh/authorized_keys"
  else
    cat "$DEPLOY_KEY" >> ~/.ssh/authorized_keys
    log "deploy key appended to authorized_keys"
  fi
fi

# ---------------------------------------------------------------- verify
if [ "$DRY_RUN" = "1" ]; then
  log "✅ dry run complete — nothing was changed"
  exit 0
fi
log "verifying"
sleep 3
"$ROOT/bin/release.sh" status
status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:3000/ || echo 000)
[ "$status" = "200" ] || fail "app did not answer on localhost:3000 (HTTP $status) — check: sudo journalctl -u $SERVICE -n 50"
log "✅ bootstrap complete — app healthy on the new layout"
log ""
log "The old $OLD_APP is untouched. Once you've seen a few good deploys,"
log "it and the stale build in $ROOT/.output can be removed by hand."
