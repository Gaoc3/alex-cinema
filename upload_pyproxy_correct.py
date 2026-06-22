import paramiko
import base64

with open('pyproxy_new.py', 'rb') as f:
    content = f.read()

encoded = base64.b64encode(content).decode()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "echo {encoded} | base64 -d > /opt/pyproxy.py && systemctl restart pyproxy"'

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
ssh.close()
