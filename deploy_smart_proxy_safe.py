import paramiko
import base64

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

with open('smart_proxy.py', 'r', encoding='utf-8') as f:
    code = f.read()

b64 = base64.b64encode(code.encode('utf-8')).decode('utf-8')

# We run a single command that reads from stdin
cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'base64 -d > /opt/smart_proxy/smart_proxy.py && systemctl restart smart_proxy'"
stdin, stdout, stderr = c.exec_command(cmd)
stdin.write(b64 + "\n")
stdin.flush()
stdin.channel.eof_received = True

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
