killall uclient-fetch dbclient 2>/dev/null
sleep 2
rm -rf /tmp/usr/bin /tmp/usr/lib /tmp/*.ipk 2>/dev/null
kill $(cat /tmp/rc_local_pid 2>/dev/null) 2>/dev/null
rm -f /tmp/rc_local_pid
/etc/rc.local &
sleep 4
ps | grep dbclient