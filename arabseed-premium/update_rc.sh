cat > /tmp/new_rc.local << 'EOF'
#!/bin/sh

PIDFILE=/tmp/rc_local_pid
if [ -f ${PIDFILE} ]; then
 OLPID=$(cat ${PIDFILE})
 if [ -d /proc/${OLPID} ]; then
 exit 0
 fi
fi
echo $$ > ${PIDFILE}

killall uclient-fetch dbclient 2>/dev/null

# Start SNI proxy TCP tunnel
while true; do
  dbclient -i /etc/dropbear/serveo_key -y -K 60 \
    -R sniproxy:8443:127.0.0.1:8443 \
    serveo.net "sleep 999999999" < /dev/null > /tmp/tunnel_sni.log 2>&1
  sleep 10
done &

exit 0
EOF
cp /tmp/new_rc.local /etc/rc.local
chmod +x /etc/rc.local
echo "=== rc.local updated ==="
cat /etc/rc.local