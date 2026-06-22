import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('64.225.99.144', username='root', key_filename='C:\\Users\\secon\\.ssh\\id_rsa')

command = "cat /etc/nginx/sites-available/default"
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode())
ssh.close()
