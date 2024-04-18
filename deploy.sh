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
set +x
echo "done copying the $SOURCEDIR"
echo
echo

# generate service file, https://wiki.ubuntuusers.de/Howto/systemd_Service_Unit_Beispiel/
#
$SSHSERVER "(cd $TARGETDIR; sudo cp ubuntuserver/tne.service  /etc/systemd/system/tne.service; sudo systemctl enable tne.service ; sudo systemctl start tne.service )"

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
