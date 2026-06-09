#!/bin/sh

# Save CGI env for debugging
# set > /tmp/cgi_env

# Parse QUERY_STRING
url=""
range=""
IFS='&'
for pair in $QUERY_STRING; do
  case "$pair" in
    url=*) url="${pair#url=}" ;;
    range=*) range="${pair#range=}" ;;
  esac
done

# URL-decode the url parameter
url=$(printf '%b' "${url//%/\\x}")

if [ -z "$url" ]; then
  echo "Content-Type: text/plain"
  echo "Access-Control-Allow-Origin: *"
  echo ""
  echo "ERROR: missing url"
  exit 0
fi

# Use uclient-fetch to get the URL
# uclient-fetch notes:
# - q: quiet, O-: stdout
# - no --header support (no Range/Accept/Referer forwarding)
# - but User-Agent can be set via -U
# - TLS works via wolfSSL
result=$(uclient-fetch -q -O- "$url" 2>&1)
rc=$?

# Output CGI headers
echo "Content-Type: text/plain"
echo "Access-Control-Allow-Origin: *"
echo "Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges"
echo ""

if [ $rc -ne 0 ]; then
  echo "ERROR: uclient-fetch failed (rc=$rc): $result"
  exit 0
fi

echo "$result"