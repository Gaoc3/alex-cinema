import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

remote_python = """
with open('/etc/nginx/sites-available/default', 'r') as f:
    print(f.read())
"""
encoded = base64.b64encode(remote_python.encode()).decode()

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "python3 -c \\"import base64; exec(base64.b64decode(\'{encoded}\'))\\""'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode())
ssh.close()
