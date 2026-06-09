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

# Single tunnel - all CDN requests through mtskycinemana:80
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

# Write universal proxy CGI - passes raw response body
cat > /www/cgi-bin/proxy << 'CGIEOF'
#!/bin/sh
# Universal proxy CGI - fetches from any CDN and returns raw body
# Query: url=<encoded_url>&host=<host>

URL=""
Q=$QUERY_STRING
case "$Q" in
 *url=*) URL=$(echo "$Q" | sed 's/.*url=\([^&]*\).*/\1/') ;;
esac

if [ -z "$URL" ]; then
 echo "Content-Type: text/plain"
 echo ""
 echo "ERROR: missing url"
 exit 1
fi

# Build fetch command with forwarded headers
H=""
[ -n "$HTTP_RANGE" ] && H="$H --header=Range:$HTTP_RANGE"
[ -n "$HTTP_ACCEPT" ] && H="$H --header=Accept:$HTTP_ACCEPT"
[ -n "$HTTP_REFERER" ] && H="$H --header=Referer:$HTTP_REFERER"
[ -z "$HTTP_REFERER" ] && H="$H --header=Referer:https://cinemana.shabakaty.com/"
[ -n "$HTTP_USER_AGENT" ] && H="$H --header=User-Agent:$HTTP_USER_AGENT"

# Output passthrough headers
echo "Content-Type: application/octet-stream"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Expose-Headers: *"
echo "Cache-Control: no-cache"
echo ""

# Fetch and pipe raw body to stdout (discard stderr which has HTTP status/headers)
uclient-fetch -q -O- $H "$URL" 2>/dev/null
CGIEOF

chmod +x /www/cgi-bin/proxy

# Update API CGI to use proxy
# Link api -> proxy (same script handles all)
ln -sf /www/cgi-bin/proxy /www/cgi-bin/api 2>/dev/null

# Kill old and restart
killall uclient-fetch dbclient 2>/dev/null
sleep 2
/etc/rc.local &
sleep 6
echo ' === Tunnel restarted ==='
cat /tmp/tunnel_serveo.log 2>/dev/null | tail -5