import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.1.1", username="root", password="punisher001", timeout=30)
stdin, stdout, stderr = ssh.exec_command("dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'pm2 logs cinemana --lines 50 --nostream'")
with open("vps_logs.txt", "wb") as f:
    f.write(stdout.read())
ssh.close()
