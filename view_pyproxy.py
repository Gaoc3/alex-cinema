import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "cat /opt/pyproxy.py"'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode(errors='replace'))
ssh.close()
