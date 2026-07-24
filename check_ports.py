import paramiko

VPS_IP = "64.225.99.144"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.1.1", username="root", password="punisher001", timeout=15)
stdin, stdout, stderr = ssh.exec_command(f"dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} 'netstat -tulnp | grep -E \":80|:443\"'")
print("STDOUT:", stdout.read().decode('utf-8', errors='ignore'))
ssh.close()
