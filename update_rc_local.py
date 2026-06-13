import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to Router (192.168.1.1)...")
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=15)
    
    rc_local_content = """#!/bin/sh

PIDFILE=/tmp/rc_local_pid
if [ -f ${PIDFILE} ]; then
 OLPID=$(cat ${PIDFILE})
 if [ -d /proc/${OLPID} ]; then
 exit 0
 fi
fi
echo $$ > ${PIDFILE}

killall uclient-fetch dbclient ssh-openssh 2>/dev/null

while true; do
  dbclient -y -y -c chacha20-poly1305@openssh.com -W 4194304 -K 60 -I 0 -i /etc/dropbear/id_rsa -N -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 root@64.225.99.144
  sleep 10
done &

exit 0
"""
    
    commands = [
        "killall dbclient",
        f"cat << 'EOF' > /etc/rc.local\n{rc_local_content}\nEOF",
        "chmod +x /etc/rc.local",
        "sh /etc/rc.local",
        "sleep 3",
        "ps | grep dbclient"
    ]
    
    for cmd in commands:
        print(f"\n--- {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print("STDOUT:\n", stdout.read().decode())
        print("STDERR:\n", stderr.read().decode())
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
