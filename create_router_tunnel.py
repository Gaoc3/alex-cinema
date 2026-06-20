import paramiko
import os
import time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

init_script = """#!/bin/sh /etc/rc.common

START=99

start() {
    echo "Starting Cinemana SSH Tunnel..."
    while true; do
        dbclient -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 -N
        sleep 5
    done &
}

stop() {
    echo "Stopping Cinemana SSH Tunnel..."
    killall dbclient
}
"""

c.exec_command(f"cat << 'EOF' > /etc/init.d/cinemana_tunnel\n{init_script}EOF")
c.exec_command("chmod +x /etc/init.d/cinemana_tunnel")
c.exec_command("/etc/init.d/cinemana_tunnel enable")
c.exec_command("/etc/init.d/cinemana_tunnel start")

stdin, stdout, stderr = c.exec_command("ps | grep dbclient")
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
