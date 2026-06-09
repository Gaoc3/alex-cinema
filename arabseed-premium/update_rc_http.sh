cat > /tmp/new_rc.local << 'SHEOF'
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

# HTTP subdomain tunnel for CGI proxy
while true; do
  dbclient -i /etc/dropbear/serveo_key -y -K 60 \
    -R mtskycinemana:80:127.0.0.1:80 \
    serveo.net "sleep 999999999" < /dev/null > /tmp/tunnel_serveo.log 2>&1
  sleep 10
done &

exit 0
SHEOF
cp /tmp/new_rc.local /etc/rc.local
chmod +x /etc/rc.local
echo "OK"
cat /etc/rc.local