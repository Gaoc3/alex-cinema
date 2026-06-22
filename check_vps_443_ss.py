import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "ss -tulpn | grep 443"'

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode(errors='ignore'))
print("STDERR:\n", stderr.read().decode(errors='ignore'))
ssh.close()
