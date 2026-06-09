cat > /etc/rc.local << 'EOF'
#!/bin/sh
# Tunnel services - single tunnel (mtskycinemana:80) handles everything

PIDFILE=/tmp/rc_local_pid
if [ -f ${PIDFILE} ]; then
 OLPID=$(cat ${PIDFILE})
 if [ -d /proc/${OLPID} ]; then
 exit 0
 fi
fi
echo $$ > ${PIDFILE}

killall uclient-fetch dbclient 2>/dev/null

# Single serveo tunnel - everything goes through mtskycinemana:80
(
 while true; do
 dbclient -i /etc/dropbear/serveo_key -y -K 60 \
   -R mtskycinemana:80:127.0.0.1:80 \
   serveo.net sleep 999999999 < /dev/null > /tmp/tunnel_serveo.log 2>&1
 sleep 10
 done
) &

exit 0
EOF

# Also rewrite the CGI to handle all CDN types
cat > /www/cgi-bin/proxy << 'CGIEOF'
#!/bin/sh
# Universal proxy CGI - fetches from any shabakaty CDN
# Usage: /cgi-bin/proxy?url=<encoded_url>

# Parse URL from query string
URL=""
if echo "$QUERY_STRING" | grep -q 'url='; then
 URL=$(echo "$QUERY_STRING" | sed 's/.*url=\([^&]*\).*/\1/' | sed 's/+/ /g;s/%\(..\)/\\x\1/g')
fi

if [ -z "$URL" ]; then
 echo "Content-Type: text/plain"
 echo ""
 echo "ERROR: missing url parameter"
 exit 1
fi

# Reconstruct URL (handle percent-encoding)
URL=$(printf "$URL")

# Extract hostname for routing
HOST=$(echo "$URL" | sed 's|https\?://\([^/]*\).*|\1|')

# Determine which headers to forward
HEADERS=""
if [ -n "$HTTP_RANGE" ]; then
 HEADERS="$HEADERS --header=Range:$HTTP_RANGE"
fi
if [ -n "$HTTP_ACCEPT" ]; then
 HEADERS="$HEADERS --header=Accept:$HTTP_ACCEPT"
fi
if [ -n "$HTTP_REFERER" ]; then
 HEADERS="$HEADERS --header=Referer:$HTTP_REFERER"
fi
if [ -n "$HTTP_USER_AGENT" ]; then
 HEADERS="$HEADERS --header=User-Agent:$HTTP_USER_AGENT"
fi

# Add default referer for shabakaty CDNs
case "$HOST" in
 *shabakaty.com)
   HEADERS="$HEADERS --header=Referer:https://cinemana.shabakaty.com/"
   ;;
esac

# Build fetch command
FETCH="uclient-fetch -q -O- $HEADERS"

# Execute and pipe directly to stdout
# Note: uclient-fetch writes headers to stderr, body to stdout
# We need to capture content-type from stderr
TMPFILE=$(mktemp /tmp/proxy.XXXXXX)
TMPHEAD=$(mktemp /tmp/proxyhead.XXXXXX)

$FETCH "$URL" > "$TMPFILE" 2> "$TMPHEAD"
RET=$?

if [ $RET -ne 0 ]; then
 echo "Content-Type: text/plain"
 echo "Status: 502"
 echo ""
 echo "ERROR: fetch failed (exit code $RET)"
 rm -f "$TMPFILE" "$TMPHEAD"
 exit 0
fi

# Try to extract Content-Type from response headers
CT=$(grep -i '^Content-Type:' "$TMPHEAD" | sed 's/[Cc]ontent-[Tt]ype:[ ]*//' | head -1)
if [ -z "$CT" ]; then
 CT="application/octet-stream"
fi

# Try to extract Content-Length
CL=$(grep -i '^Content-Length:' "$TMPHEAD" | sed 's/[Cc]ontent-[Ll]ength:[ ]*//' | head -1)

# Try to extract Content-Range
CR=$(grep -i '^Content-Range:' "$TMPHEAD" | sed 's/[Cc]ontent-[Rr]ange:[ ]*//' | head -1)

# Check if response was 206 (partial content)
STATUS="200 OK"
if grep -q '^HTTP.*206' "$TMPHEAD" 2>/dev/null || grep -q '206 Partial' "$TMPHEAD" 2>/dev/null; then
 STATUS="206 Partial Content"
fi

# Output headers
echo "Content-Type: $CT"
[ -n "$CL" ] && echo "Content-Length: $CL"
[ -n "$CR" ] && echo "Content-Range: $CR"
echo "Status: $STATUS"
echo "Cache-Control: no-cache"
echo "Access-Control-Allow-Origin: *"
echo ""

# Output body
cat "$TMPFILE"

rm -f "$TMPFILE" "$TMPHEAD"
CGIEOF

chmod +x /www/cgi-bin/proxy

# Also update the api CGI to point to the new universal proxy
cat > /www/cgi-bin/api << 'APIEOF'
#!/bin/sh
# API proxy - redirects to the universal proxy for API calls
# Usage: /cgi-bin/api?url=<encoded_url>
# For API requests (cinemana.shabakaty.com), redirect to proxy with proper headers
cat /www/cgi-bin/proxy
APIEOF

chmod +x /www/cgi-bin/api

killall uclient-fetch dbclient 2>/dev/null
sleep 2
kill $(cat /tmp/rc_local_pid 2>/dev/null) 2>/dev/null
rm -f /tmp/rc_local_pid
/etc/rc/local &
sleep 6
echo '=== Log ==='
tail -15 /tmp/tunnel_serveo.log 2>/dev/null