import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

sh_script = """#!/bin/sh
while true; do
    dbclient -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 -R 8085:cndw1.shabakaty.com:443 -R 8086:cndw3.shabakaty.com:443 -R 8087:cndw4.shabakaty.com:443 -R 8088:cndw5.shabakaty.com:443 -R 8089:cnth1.shabakaty.com:443 -R 8090:cnth3.shabakaty.com:443 -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 -N
    sleep 5
done
"""

ssh.exec_command(f"cat << 'EOF' > /root/start_tunnel.sh\n{sh_script}EOF")
ssh.exec_command("chmod +x /root/start_tunnel.sh")

# Kill existing dropbear sessions that have tunnels
ssh.exec_command("killall dbclient; killall start_tunnel.sh")
time.sleep(2)

# Start it now
ssh.exec_command("/root/start_tunnel.sh > /dev/null 2>&1 &")
time.sleep(2)

stdin, stdout, stderr = ssh.exec_command("ps | grep start_tunnel")
print("STDOUT:\n", stdout.read().decode())

ssh.close()
