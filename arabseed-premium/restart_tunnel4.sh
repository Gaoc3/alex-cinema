cat > /etc/rc.local << 'EOF'
#!/bin/sh
# Tunnel services for arabseed-premium - single instance via PID file

PIDFILE=/tmp/rc_local_pid
if [ -f ${PIDFILE} ]; then
 OLPID=$(cat ${PIDFILE})
 if [ -d /proc/${OLPID} ]; then
 exit 0
 fi
fi
echo $$ > ${PIDFILE}

killall uclient-fetch dbclient 2>/dev/null

# Serveo.net tunnel - TCP forward to main shabakaty server
(
 while true; do
 dbclient -i /etc/dropbear/serveo_key -y -K 60 \
   -R cdnproxy:8443:cdn.shabakaty.com:443 \
   serveo.net sleep 999999999 < /dev/null > /tmp/tunnel_serveo.log 2>&1
 sleep 10
 done
) &

exit 0
EOF
killall uclient-fetch dbclient 2>/dev/null
sleep 2
kill $(cat /tmp/rc_local_pid 2>/dev/null) 2>/dev/null
rm -f /tmp/rc_local_pid
/etc/rc.local &
sleep 6
echo '=== Log ==='
tail -15 /tmp/tunnel_serveo.log 2>/dev/null