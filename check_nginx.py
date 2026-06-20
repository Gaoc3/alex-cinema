import paramiko
import sys

# Ensure stdout uses utf-8 instead of cp1252
sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'systemctl status nginx --no-pager'"
stdin, stdout, stderr = c.exec_command(cmd)
print('STDOUT:\n', stdout.read().decode('utf-8', errors='ignore'))
print('STDERR:\n', stderr.read().decode('utf-8', errors='ignore'))
