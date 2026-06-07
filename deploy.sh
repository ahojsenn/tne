#!/bin/bash
set -e

TARGETUSER=hannes
TARGETSERVER=konfi.kommitment.works
SOURCEDIR=$(basename "$PWD")
TARGETDIR=/home/$TARGETUSER/$SOURCEDIR/
DEPLOYMENTTARGET=$TARGETUSER@$TARGETSERVER:$TARGETDIR
SSHPORT=22
SSH="ssh -p $SSHPORT -t $TARGETUSER@$TARGETSERVER"

# Finally block: always stream production logs after the script exits (success or failure),
# so you can immediately see what the server is doing. Press Ctrl+C to stop tailing.
trap '
  echo ""
  echo "📋 Streaming production logs from $TARGETSERVER — press Ctrl+C to stop"
  ssh -p $SSHPORT $TARGETUSER@$TARGETSERVER "tail -f /tmp/tne.log"
' EXIT

# Build
yarn build

# Sync build output and server config
echo "Deploying to $TARGETSERVER:$TARGETDIR"
$SSH "mkdir -p $TARGETDIR"
set +e
rsync --copy-links --hard-links --delete -avRe "ssh -p $SSHPORT" ./.output ./ubuntuserver $DEPLOYMENTTARGET
scp .env $DEPLOYMENTTARGET
set -e
echo "Files copied."

# Install and restart services (single sudo prompt)
$SSH "
  cd $TARGETDIR
  sudo cp ubuntuserver/tne.service /etc/systemd/system/tne.service
  sudo systemctl enable tne.service
  sudo systemctl restart tne.service
  sudo cp ubuntuserver/nginx-tne.conf /etc/nginx/sites-available/tne.conf
  sudo ln -sf /etc/nginx/sites-available/tne.conf /etc/nginx/sites-enabled/tne.conf
  sudo nginx -t && sudo systemctl restart nginx
  sudo ufw deny 3000 2>/dev/null || true
"

open https://$TARGETSERVER

# Health check with retries
MAX_RETRIES=5
RETRY_INTERVAL=5
for i in $(seq 1 $MAX_RETRIES); do
  sleep $RETRY_INTERVAL
  echo "Checking deployment (attempt $i/$MAX_RETRIES)..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://$TARGETSERVER)
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Deployment OK — https://$TARGETSERVER returned HTTP $HTTP_STATUS"
    exit 0
  fi
  echo "   Got HTTP $HTTP_STATUS, retrying in ${RETRY_INTERVAL}s..."
done
echo "❌ Deployment check failed after $MAX_RETRIES attempts — last status: HTTP $HTTP_STATUS"
exit 1


