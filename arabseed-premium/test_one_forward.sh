# Already killed everything and waited from previous test
# Now start just ONE tunnel - TCP forward to router:8443
dbclient -i /etc/dropbear/serveo_key -y -K 60 \
  -R cdntunnel:8443:127.0.0.1:8443 \
  serveo.net "sleep 40" < /dev/null > /tmp/onetest.log 2>&1 &
sleep 20
echo "=== Log ==="
cat /tmp/onetest.log 2>/dev/null