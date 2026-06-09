killall dbclient 2>/dev/null
echo "Waiting 60s for serveo server to free tunnels..."
sleep 60
echo "Done waiting, now connecting..."

dbclient -i /etc/dropbear/serveo_key -y -K 60 \
  -R mtskycinemana:80:127.0.0.1:80 \
  -R cdntunnel:8443:127.0.0.1:8443 \
  serveo.net "sleep 30" < /dev/null > /tmp/test_tunnel.log 2>&1 &
sleep 15
echo "=== Log ==="
cat /tmp/test_tunnel.log 2>/dev/null