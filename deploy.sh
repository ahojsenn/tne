#!/bin/bash
#
export TARGETUSER=hannes
export TARGETSERVER=konfi.kommitment.works # kommitment hetzner server
export SOURCEDIR=`echo ${PWD##*/}`
export TARGETDIR=/home/$TARGETUSER/$SOURCEDIR/
export DEPLOYMENTTARGET=$TARGETUSER@$TARGETSERVER:$TARGETDIR
export SSHPORT=22
export SSHSERVER="ssh -p"$SSHPORT" -t $TARGETUSER@$TARGETSERVER"
export HTTPPORT=3000
export HTTPSPORT=3000
export WEBSERVERCMD="node tomatoes-and-eggs/.output/server/index.mjs"
export LOGFILE="/tmp/tomatoesAndEggs.log"
export TARGETPROGRAM=simpleServer

$SSHSERVER "killall -q node"
yarn build

# rsync html
set +e # rsync is strange
echo "Deploy stuff to "$TARGETSERVER $TARGETDIR
$SSHSERVER mkdir -p $TARGETDIR
set -x
rsync  --copy-links --hard-links --stats -avRe "ssh -p $SSHPORT" ./.output $DEPLOYMENTTARGET
scp .env $DEPLOYMENTTARGET
set +x
echo "done copying the $SOURCEDIR"
echo
echo

# generate service file, https://wiki.ubuntuusers.de/Howto/systemd_Service_Unit_Beispiel/
#
$SSHSERVER "killall node"
$SSHSERVER "(cd $TARGETDIR; sudo cp ubuntuserver/tne.service  /etc/systemd/system/tne.service; sudo systemctl enable tne.service ; sudo systemctl start tne.service )"

# deploy nginx config with WebSocket support and reload
$SSHSERVER "(cd $TARGETDIR; sudo cp ubuntuserver/nginx-tne.conf /etc/nginx/sites-available/tne.conf; sudo ln -sf /etc/nginx/sites-available/tne.conf /etc/nginx/sites-enabled/tne.conf; sudo nginx -t && sudo systemctl reload nginx)"

# block direct access to port 3000 from outside (only localhost/nginx should reach it)
$SSHSERVER "sudo ufw deny 3000 2>/dev/null || true"

# stop and start the server
# ... 
echo "starting the webserver..."
set -x
set -e
# $SSHSERVER "(cd $TARGETDIR; $WEBSERVERCMD > $LOGFILE 2>&1 &)"
$SSHSERVER "service fail2ban stop"
set +x
echo try https://$TARGETSERVER
open https://$TARGETSERVER
