import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = """dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "
# Find and kill whatever is on 8080
fuser -k 8080/tcp || true

# Update pyproxy to port 8085
sed -i 's/port=8080/port=8085/g' /opt/pyproxy.py
systemctl restart pyproxy

# Update Nginx to pass to 8085
sed -i 's/127.0.0.1:8080/127.0.0.1:8085/g' /etc/nginx/sites-available/default
systemctl restart nginx

sleep 2
systemctl status pyproxy
"
"""
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode(errors='replace'))
print("STDERR:", stderr.read().decode(errors='replace'))
ssh.close()
