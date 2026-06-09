dbclient -i /etc/dropbear/serveo_key -y -K 60 \
  -R mtskycinemana:127.0.0.1:80 \
  serveo.net "sleep 30" < /dev/null > /tmp/httptest.log 2>&1 &
sleep 15
echo "=== Log ==="
cat /tmp/httptest.log 2>/dev/null