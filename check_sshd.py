import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)
stdin, stdout, stderr = c.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "cat /etc/ssh/sshd_config"')
print(stdout.read().decode('utf-8'))
