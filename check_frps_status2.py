import paramiko
import os
import time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'systemctl status frps --no-pager'"
stdin, stdout, stderr = c.exec_command(cmd)

out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
with open('frps_status.txt', 'w', encoding='utf-8') as f:
    f.write(out + "\n\n" + err)
