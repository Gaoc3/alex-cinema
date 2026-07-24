import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.1.1", username="root", password="punisher001", timeout=15)

stdin, stdout, stderr = ssh.exec_command("ps | grep dbclient")
print(stdout.read().decode('utf-8', errors='ignore'))
ssh.close()
