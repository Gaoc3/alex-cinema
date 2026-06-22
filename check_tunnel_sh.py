import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'cat /root/start_tunnel.sh'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode('utf-8', errors='ignore'))
ssh.close()
