import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'cat /etc/dropbear/id_rsa'
stdin, stdout, stderr = ssh.exec_command(command)
private_key = stdout.read().decode('utf-8')
ssh.close()

with open('vps_id_rsa', 'w') as f:
    f.write(private_key)

print("Downloaded private key successfully.")
