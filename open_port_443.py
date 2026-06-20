import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'ufw allow 443/tcp'"
stdin, stdout, stderr = c.exec_command(cmd)
print('STDOUT:\n', stdout.read().decode('utf-8', errors='ignore'))
print('STDERR:\n', stderr.read().decode('utf-8', errors='ignore'))
