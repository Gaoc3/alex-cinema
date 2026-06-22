import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = "nslookup cdn.shabakaty.com; nslookup cndw2.shabakaty.com; nslookup cndw4.shabakaty.com"
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode())
ssh.close()
