cat > /etc/rc.local << 'EOF'
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

# Single tunnel for API via CGI
(
 while true; do
 dbclient -i /etc/dropbear/serveo_key -y -K 60 \
   -R mtskycinemana:80:127.0.0.1:80 \
   serveo.net "sleep 999999999" < /dev/null > /tmp/tunnel_serveo.log 2>&1
 sleep 10
 done
) &

exit 0
EOF

# Write a simple proxy CGI that FORWARDS requests through uclient-fetch
# For video/images, we'll add a Lua SNI proxy and another tunnel later
cat > /www/cgi-bin/proxy << 'CGIEOF'
#!/bin/sh
# Universal proxy CGI - fetches from any CDN and returns raw body
Q=$QUERY_STRING
URL=""
case "$Q" in
 *url=*) URL=$(echo "$Q" | sed 's/.*url=\([^&]*\).*/\1/') ;;
esac

if [ -z "$URL" ]; then
 echo "Content-Type: text/plain"
 echo ""
 echo "ERROR: missing url"
 exit 1
fi

# Forward headers from Vercel client
H="-U Mozilla/5.0"
[ -n "$HTTP_RANGE" ]      && H="$H --header=Range:$HTTP_RANGE"
[ -n "$HTTP_ACCEPT" ]     && H="$H --header=Accept:$HTTP_ACCEPT"
[ -n "$HTTP_REFERER" ]    && H="$H --header=Referer:$HTTP_REFERER"
[ -z "$HTTP_REFERER" ]    && H="$H --header=Referer:https://cinemana.shabakaty.com/"
[ -n "$HTTP_USER_AGENT" ] && H="$H --header=User-Agent:$HTTP_USER_AGENT"

echo "Content-Type: application/octet-stream"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Expose-Headers: *"
echo "Cache-Control: no-cache"
echo ""

# NOTE: --header is NOT supported by uclient-fetch on this router
# The headers above are passed to uclient-fetch but silently ignored
# This means Range header WON'T be sent to CDN
# For now, just fetch without extra headers
uclient-fetch -q -O- -U "Mozilla/5.0" "$URL" 2>/dev/null
CGIEOF
chmod +x /www/cgi-bin/proxy
ln -sf /www/cgi-bin/proxy /www/cgi-bin/api 2>/dev/null

killall uclient-fetch dbclient 2>/dev/null
sleep 2
/etc/rc.local &
sleep 8
echo "=== Tunnel status ==="
cat /tmp/tunnel_serveo.log 2>/dev/null | tail -10
echo ""
echo "=== CGI test ==="
uclient-fetch -q -O- --timeout=5 "http://127.0.0.1/cgi-bin/proxy?url=test" 2>/dev/null