import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'cat /etc/nginx/sites-available/default'
remote_cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 '{command}'"

stdin, stdout, stderr = ssh.exec_command(remote_cmd)
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
ssh.close()
