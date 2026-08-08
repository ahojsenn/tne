#!/bin/bash
# Server-side release manager for tne. Installed by bootstrap.sh to
# /home/hannes/tne/bin/release.sh and invoked over ssh by both the GitHub
# Actions pipeline (.github/workflows/deploy.yml) and the manual escape hatch
# (deploy.sh). Both paths go through this script so a hand-rolled emergency
# deploy lands in exactly the same layout the pipeline expects.
#
#   release.sh activate <tarball>   extract, flip, restart, verify, rollback on failure
#   release.sh rollback [id]        return to the previous (or a named) release
#   release.sh status               what is live right now
#   release.sh list                 available releases
#
# Layout:
#   $ROOT/releases/<id>/   one unpacked build (.output + ubuntuserver)
#   $ROOT/releases/<id>/.env -> ../../shared/.env
#   $ROOT/current -> releases/<id>   atomically swapped; systemd points here
#   $ROOT/shared/.env      the only copy of production secrets on the box
#   $ROOT/incoming/        upload staging area for tarballs
set -euo pipefail

# Overridable only so the test harness can drive this script against a
# throwaway root with a stubbed service; production uses every default.
ROOT=${TNE_ROOT:-/home/hannes/tne}
SERVICE=${TNE_SERVICE:-tne.service}
LOCAL_URL=${TNE_LOCAL_URL:-http://127.0.0.1:3000/}
PUBLIC_URL=${TNE_PUBLIC_URL:-https://konfi.kommitment.works/}
LOG_FILE=${TNE_LOG_FILE:-/tmp/tne.log}

RELEASES=$ROOT/releases
SHARED=$ROOT/shared
INCOMING=$ROOT/incoming
CURRENT=$ROOT/current
KEEP_RELEASES=${TNE_KEEP_RELEASES:-5}

MAX_RETRIES=${TNE_MAX_RETRIES:-10}
RETRY_INTERVAL=${TNE_RETRY_INTERVAL:-3}

log()  { echo "[release] $*"; }
fail() { echo "[release] ❌ $*" >&2; exit 1; }

current_id() {
  [ -L "$CURRENT" ] || return 1
  basename "$(readlink -f "$CURRENT")"
}

# The check that would have caught the old "green deploy of stale code" bug:
# ask systemd for the running PID and confirm its working directory really is
# the release we just activated. A restart that silently kept serving an old
# build fails here instead of passing a health check.
verify_running_release() {
  local expected=$1 pid cwd
  pid=$(systemctl show -p MainPID --value "$SERVICE")
  [ -n "$pid" ] && [ "$pid" != "0" ] || fail "$SERVICE has no main PID — it is not running"
  cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null) || fail "cannot read cwd of PID $pid"
  if [ "$cwd" != "$(readlink -f "$RELEASES/$expected")" ]; then
    fail "PID $pid is running from $cwd, expected $RELEASES/$expected"
  fi
  log "✅ PID $pid is running from release $expected"
}

health_check() {
  local url=$1 label=$2 i status
  for i in $(seq 1 $MAX_RETRIES); do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
    if [ "$status" = "200" ]; then
      log "✅ $label returned HTTP 200 (attempt $i)"
      return 0
    fi
    log "   $label → HTTP $status, retry $i/$MAX_RETRIES in ${RETRY_INTERVAL}s"
    sleep $RETRY_INTERVAL
  done
  log "❌ $label never returned 200 (last: HTTP $status)"
  return 1
}

restart_service() {
  # The only privileged operation in the deploy path. bootstrap.sh installs a
  # sudoers drop-in scoped to exactly this one command so CI can run it
  # without a TTY or a password.
  sudo -n /usr/bin/systemctl restart "$SERVICE" \
    || fail "could not restart $SERVICE (is /etc/sudoers.d/tne-deploy installed? run bootstrap.sh)"
}

# Point $CURRENT at a release without ever leaving the symlink absent:
# ln -sfn writes a temp link, mv -T renames it over the old one atomically.
switch_to() {
  local id=$1
  [ -d "$RELEASES/$id" ] || fail "release $id does not exist"
  ln -sfn "$RELEASES/$id" "$CURRENT.tmp"
  mv -T "$CURRENT.tmp" "$CURRENT"
  log "current -> releases/$id"
}

prune_releases() {
  local live keep
  live=$(current_id || echo "")
  # Newest KEEP_RELEASES by name (ids are UTC-timestamp-prefixed, so name
  # order is chronological), always keeping whatever is currently live.
  keep=$(ls -1 "$RELEASES" | sort -r | head -n "$KEEP_RELEASES")
  ls -1 "$RELEASES" | while read -r id; do
    if ! echo "$keep" | grep -qx "$id" && [ "$id" != "$live" ]; then
      log "pruning old release $id"
      rm -rf "${RELEASES:?}/$id"
    fi
  done
}

cmd_activate() {
  local tarball=$1 id previous
  [ -f "$tarball" ] || fail "tarball not found: $tarball"

  # Release id is the tarball basename: <UTC timestamp>-<short sha>.tar.gz
  id=$(basename "$tarball" .tar.gz)
  [ -n "$id" ] || fail "could not derive release id from $tarball"
  [ -e "$RELEASES/$id" ] && fail "release $id already exists — refusing to overwrite"

  previous=$(current_id || echo "")
  log "activating $id (previous: ${previous:-none})"

  mkdir -p "$RELEASES/$id"
  tar -xzf "$tarball" -C "$RELEASES/$id"
  [ -f "$RELEASES/$id/.output/server/index.mjs" ] \
    || fail "$id has no .output/server/index.mjs — bad tarball"

  # Secrets are never shipped with a release; each one borrows the single
  # shared copy. The app's envCheck nitro plugin reads .env from the project
  # root, which resolves through this symlink.
  [ -f "$SHARED/.env" ] || fail "$SHARED/.env is missing — run bootstrap.sh first"
  ln -sfn ../../shared/.env "$RELEASES/$id/.env"

  switch_to "$id"
  restart_service

  if verify_running_release "$id" && health_check "$LOCAL_URL" "app (localhost:3000)" \
     && health_check "$PUBLIC_URL" "public ($PUBLIC_URL)"; then
    log "✅ release $id is live"
    rm -f "$tarball"
    prune_releases
    cmd_status
    return 0
  fi

  # Failed. Tombstone it first: the directory is kept for forensics, but a
  # later `rollback` with no argument must never pick the release that just
  # failed verification — it is the newest one, so without this marker it
  # would be the default target.
  log "❌ release $id failed verification"
  touch "$RELEASES/$id/.failed"

  # Put the previous release back before giving up.
  if [ -n "$previous" ] && [ -d "$RELEASES/$previous" ]; then
    log "rolling back to $previous"
    switch_to "$previous"
    restart_service
    if verify_running_release "$previous" && health_check "$LOCAL_URL" "app after rollback"; then
      log "✅ rolled back to $previous — site is up on the previous release"
    else
      log "🚨 ROLLBACK ALSO FAILED — site may be down. Check: journalctl -u $SERVICE -n 50"
    fi
  else
    log "🚨 no previous release to roll back to — site may be down"
  fi
  log "--- last 40 log lines ---"
  tail -n 40 "$LOG_FILE" 2>/dev/null || true
  exit 1
}

cmd_rollback() {
  local target=${1:-} live candidate
  live=$(current_id || echo "")
  if [ -z "$target" ]; then
    # Most recent release that is neither live nor tombstoned as failed.
    target=""
    while read -r candidate; do
      [ -n "$candidate" ] || continue
      [ "$candidate" = "$live" ] && continue
      [ -e "$RELEASES/$candidate/.failed" ] && continue
      target=$candidate
      break
    done <<< "$(ls -1 "$RELEASES" | sort -r)"
  elif [ -e "$RELEASES/$target/.failed" ]; then
    log "⚠️  $target previously failed verification — rolling back to it anyway, as asked"
  fi
  [ -n "$target" ] || fail "no other healthy release to roll back to (see: release.sh list)"
  log "rolling back from ${live:-none} to $target"
  switch_to "$target"
  restart_service
  verify_running_release "$target"
  health_check "$LOCAL_URL" "app (localhost:3000)" || fail "rollback target $target is not healthy"
  log "✅ rolled back to $target"
  cmd_status
}

cmd_status() {
  local id
  id=$(current_id || echo "(none)")
  echo "current release : $id"
  echo "service         : $(systemctl is-active $SERVICE 2>/dev/null || echo unknown)"
  if [ -f "$CURRENT/RELEASE_INFO" ]; then
    echo "--- RELEASE_INFO ---"
    cat "$CURRENT/RELEASE_INFO"
  fi
}

cmd_list() {
  local live
  live=$(current_id || echo "")
  ls -1 "$RELEASES" | sort -r | while read -r id; do
    if [ "$id" = "$live" ]; then
      echo "* $id (live)"
    elif [ -e "$RELEASES/$id/.failed" ]; then
      echo "  $id (failed verification)"
    else
      echo "  $id"
    fi
  done
}

mkdir -p "$RELEASES" "$SHARED" "$INCOMING"

case "${1:-}" in
  activate) shift; [ $# -ge 1 ] || fail "usage: release.sh activate <tarball>"; cmd_activate "$1" ;;
  rollback) shift; cmd_rollback "${1:-}" ;;
  status)   cmd_status ;;
  list)     cmd_list ;;
  *) echo "usage: release.sh {activate <tarball>|rollback [id]|status|list}" >&2; exit 2 ;;
esac
