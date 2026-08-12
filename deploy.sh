#!/bin/bash
# Manual deploy — the escape hatch for when GitHub Actions is unavailable.
#
# The normal path is `git tag v1.2.3 && git push origin v1.2.3`, which runs
# .github/workflows/deploy.yml. This script exists for the day that isn't an
# option, and it deliberately goes through the SAME server-side release
# manager (ubuntuserver/release.sh) so a hand-rolled deploy lands in exactly
# the layout the pipeline expects — same release dir, same atomic symlink
# flip, same verification, same automatic rollback.
#
#   ./deploy.sh              build, ship, activate
#   ./deploy.sh --logs       ...then stream production logs
#   ./deploy.sh --rollback   return production to the previous release
#   ./deploy.sh --status     what is live right now
#
# Requires the server to have been prepared once by ubuntuserver/bootstrap.sh.
#
# (shift-based arg loop rather than `for arg in "$@"`: macOS still ships bash
# 3.2, where expanding "$@" with no positional parameters trips `set -u`.)
set -euo pipefail

TARGETUSER=hannes
TARGETSERVER=konfi.kommitment.works
SSHPORT=22
ROOT=/home/$TARGETUSER/tne
RELEASE_SH=$ROOT/bin/release.sh
SSH="ssh -p $SSHPORT $TARGETUSER@$TARGETSERVER"
# Options must come before the host — `$SSH -t` would append -t after it, where
# ssh treats it as part of the remote command.
SSH_TTY="ssh -p $SSHPORT -t $TARGETUSER@$TARGETSERVER"

TAIL_LOGS=0
ACTION=deploy
while [ $# -gt 0 ]; do
  case "$1" in
    --logs)     TAIL_LOGS=1 ;;
    --rollback) ACTION=rollback ;;
    --status)   ACTION=status ;;
    *) echo "Unknown option: $1" >&2
       echo "Usage: $0 [--logs] [--rollback] [--status]" >&2; exit 2 ;;
  esac
  shift
done

tail_logs_if_requested() {
  if [ "$TAIL_LOGS" = "1" ]; then
    echo ""
    echo "📋 Streaming production logs from $TARGETSERVER — press Ctrl+C to stop"
    # A TTY, so journalctl -f stays interruptible with Ctrl+C.
    $SSH_TTY "journalctl -u tne.service -f"
  fi
}

# Fail early and clearly if the server has not been bootstrapped, rather than
# part-way through with a half-uploaded release.
$SSH "test -x $RELEASE_SH" \
  || { echo "❌ $RELEASE_SH not found on $TARGETSERVER." >&2
       echo "   Run ubuntuserver/bootstrap.sh on the server first — see ubuntuserver/README.md." >&2
       exit 1; }

case "$ACTION" in
  status)   $SSH "$RELEASE_SH status";   exit 0 ;;
  rollback) $SSH "$RELEASE_SH rollback"; tail_logs_if_requested; exit 0 ;;
esac

# ------------------------------------------------------------------ build
# npm, not yarn: the repo ships package-lock.json (there is no yarn.lock) and
# `npm ci` is what CI runs, so yarn would resolve a different dependency tree
# than the one the tests ran against.
npm ci
npm run build

# ---------------------------------------------------------------- package
# Release ids are UTC-timestamp-first so they sort chronologically on the
# server. A manual build off an uncommitted tree is tagged -dirty, so
# `release.sh status` can never imply the deployed code matches a commit.
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo nogit)
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  SHA="$SHA-dirty"
  echo "⚠️  Working tree has uncommitted changes — deploying as $SHA"
fi
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$SHA"
TARBALL="$RELEASE_ID.tar.gz"

cat > RELEASE_INFO <<EOF
release=$RELEASE_ID
commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)
ref=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
built=$(date -u +%Y-%m-%dT%H:%M:%SZ)
actor=$(whoami)@$(hostname -s) (manual deploy.sh)
EOF

echo "Packaging $TARBALL"
tar -czf "$TARBALL" .output ubuntuserver RELEASE_INFO
rm -f RELEASE_INFO
trap 'rm -f "$TARBALL"' EXIT

# ----------------------------------------------------------------- ship
echo "Uploading to $TARGETSERVER:$ROOT/incoming/"
scp -P $SSHPORT "$TARBALL" "$TARGETUSER@$TARGETSERVER:$ROOT/incoming/"

# release.sh flips the symlink, restarts, verifies the running process really
# is the new release, health-checks, and rolls back by itself if any of that
# fails. A non-zero exit here means production was returned to the previous
# release — not that it is broken.
$SSH "$RELEASE_SH activate $ROOT/incoming/$TARBALL"

echo "✅ Deployed $RELEASE_ID"
if [ "$(uname)" = "Darwin" ]; then open "https://$TARGETSERVER"; fi
tail_logs_if_requested
