import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = "curl -v -k -H 'Host: cndw2.shabakaty.com' 'https://cndw2.shabakaty.com' 2>&1 | head -n 30"
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode(errors='ignore'))
ssh.close()
