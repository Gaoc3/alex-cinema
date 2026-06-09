# Kill everything related to tunnel
killall dbclient uclient-fetch 2>/dev/null
kill $(cat /tmp/rc_local_pid 2>/dev/null) 2>/dev/null
rm -f /tmp/rc_local_pid

# Stop the rc.local background loop by replacing it
cat > /tmp/stop_rc.sh << 'EOF'
#!/bin/sh
# Override rc.local to stop auto-start
cat > /etc/rc.local << 'END'
#!/bin/sh
exit 0
END
# Kill any remaining processes
killall dbclient uclient-fetch 2>/dev/null
EOF
sh /tmp/stop_rc.sh

echo "All stopped. Waiting 30s for serveo cleanup..."
sleep 30
echo "Done waiting."

# Now test with clean start - 2 forwards
dbclient -i /etc/dropbear/serveo_key -y -K 60 \
  -R mtskycinemana:80:127.0.0.1:80 \
  -R cdntunnel:8443:127.0.0.1:8443 \
  serveo.net "sleep 45" < /dev/null > /tmp/clean_test.log 2>&1 &
echo "Started, waiting 20s for response..."
sleep 20
echo "=== Log ==="
cat /tmp/clean_test.log 2>/dev/null
echo "=== Extra wait 15s ==="
sleep 15
cat /tmp/clean_test.log 2>/dev/null