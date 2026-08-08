#!/bin/bash
set -euo pipefail

# Usage: ./deploy.sh [--logs]
#   --logs   after a successful deploy, stream production logs (Ctrl+C to stop)
# (shift-based loop rather than `for arg in "$@"`: macOS still ships bash 3.2,
# where expanding "$@" with no positional parameters trips `set -u`.)
TAIL_LOGS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --logs) TAIL_LOGS=1 ;;
    *) echo "Unknown option: $1" >&2; echo "Usage: $0 [--logs]" >&2; exit 2 ;;
  esac
  shift
done

TARGETUSER=hannes
TARGETSERVER=konfi.kommitment.works
SSHPORT=22

# The remote application directory. This MUST be a literal that matches the
# paths baked into ubuntuserver/tne.service — it used to be derived from
# $(basename "$PWD"), which meant renaming the local checkout silently
# redirected the deploy while systemd kept running the old directory.
# check_service_paths_match below keeps the two from drifting apart again.
APPDIR=/home/$TARGETUSER/tomatoes-and-eggs
DEPLOYMENTTARGET=$TARGETUSER@$TARGETSERVER:$APPDIR/
SSH="ssh -p $SSHPORT -t $TARGETUSER@$TARGETSERVER"

check_service_paths_match() {
  local unit=ubuntuserver/tne.service
  local workdir execpath
  workdir=$(grep -E '^WorkingDirectory=' "$unit" | cut -d= -f2- || true)
  execpath=$(grep -E '^ExecStart=' "$unit" | awk '{print $NF}' || true)

  if [ "$workdir" != "$APPDIR" ]; then
    echo "❌ $unit has WorkingDirectory=$workdir but APPDIR=$APPDIR" >&2
    exit 1
  fi
  if [ "$execpath" != "$APPDIR/.output/server/index.mjs" ]; then
    echo "❌ $unit runs $execpath, expected $APPDIR/.output/server/index.mjs" >&2
    exit 1
  fi
}
check_service_paths_match

# Build. npm, not yarn: the repo ships package-lock.json (there is no
# yarn.lock) and `npm ci` is what CI runs, so yarn would resolve a different
# dependency tree than the one the tests ran against.
npm ci
npm run build

# Sync build output and server config. No `set +e` around this: if the copy
# fails we must not go on to restart the service on stale or half-written files.
echo "Deploying to $TARGETSERVER:$APPDIR"
$SSH "mkdir -p $APPDIR"
rsync --copy-links --hard-links --delete -avRe "ssh -p $SSHPORT" ./.output ./ubuntuserver "$DEPLOYMENTTARGET"
scp .env "$DEPLOYMENTTARGET"
echo "Files copied."

# Install and restart services (single sudo prompt).
# `set -e` inside the remote shell too — without it any sudo below could fail
# and the deploy would still report success.
$SSH "
  set -e
  cd $APPDIR
  sudo cp ubuntuserver/tne.service /etc/systemd/system/tne.service
  # Required after touching the unit file: systemd serves a cached copy, so
  # without this an edited tne.service never actually takes effect.
  sudo systemctl daemon-reload
  sudo systemctl enable tne.service
  sudo systemctl restart tne.service
  sudo cp ubuntuserver/nginx-tne.conf /etc/nginx/sites-available/tne.conf
  sudo ln -sf /etc/nginx/sites-available/tne.conf /etc/nginx/sites-enabled/tne.conf
  # nginx -t gates the reload and a failed test now fails the deploy —
  # otherwise a broken config sits in sites-enabled and detonates on the next
  # unrelated reload. reload, not restart: no dropped connections.
  sudo nginx -t
  sudo systemctl reload nginx
  sudo ufw deny 3000 2>/dev/null || true
"

# Health check with retries
MAX_RETRIES=5
RETRY_INTERVAL=5
HTTP_STATUS=""
for i in $(seq 1 $MAX_RETRIES); do
  sleep $RETRY_INTERVAL
  echo "Checking deployment (attempt $i/$MAX_RETRIES)..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$TARGETSERVER")
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Deployment OK — https://$TARGETSERVER returned HTTP $HTTP_STATUS"
    # `if`, not `[ … ] && open` — under `set -e` the latter would abort the
    # script on non-macOS, where the test fails.
    if [ "$(uname)" = "Darwin" ]; then open "https://$TARGETSERVER"; fi
    if [ "$TAIL_LOGS" = "1" ]; then
      echo ""
      echo "📋 Streaming production logs from $TARGETSERVER — press Ctrl+C to stop"
      ssh -p $SSHPORT "$TARGETUSER@$TARGETSERVER" "tail -f /tmp/tne.log"
    fi
    exit 0
  fi
  echo "   Got HTTP $HTTP_STATUS, retrying in ${RETRY_INTERVAL}s..."
done

echo "❌ Deployment check failed after $MAX_RETRIES attempts — last status: HTTP $HTTP_STATUS" >&2
echo "--- last 40 lines of /tmp/tne.log ---" >&2
ssh -p $SSHPORT "$TARGETUSER@$TARGETSERVER" "tail -n 40 /tmp/tne.log" >&2 || true
exit 1
