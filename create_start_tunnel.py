import paramiko
import os
import time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

sh_script = """#!/bin/sh
while true; do
    dbclient -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 -N
    sleep 5
done
"""

c.exec_command(f"cat << 'EOF' > /root/start_tunnel.sh\n{sh_script}EOF")
c.exec_command("chmod +x /root/start_tunnel.sh")

c.exec_command(f"cat << 'EOF' > /etc/rc.local\n#!/bin/sh\n/root/start_tunnel.sh &\nexit 0\nEOF")
c.exec_command("chmod +x /etc/rc.local")

# Start it now
c.exec_command("/root/start_tunnel.sh > /dev/null 2>&1 &")
time.sleep(2)

stdin, stdout, stderr = c.exec_command("ps | grep start_tunnel")
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
