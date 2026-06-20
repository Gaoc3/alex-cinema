import paramiko
import base64

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

with open('smart_proxy.py', 'r', encoding='utf-8') as f:
    code = f.read()

b64 = base64.b64encode(code.encode('utf-8')).decode('utf-8')

# Chunk the base64 because echo has line limits
chunks = [b64[i:i+1000] for i in range(0, len(b64), 1000)]

# Write to router first
stdin, stdout, stderr = c.exec_command('rm -f /tmp/sp.b64')
stdout.read()

for chunk in chunks:
    stdin, stdout, stderr = c.exec_command(f"echo -n '{chunk}' >> /tmp/sp.b64")
    stdout.read()

# Now from router to VPS
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'cat > /opt/smart_proxy/smart_proxy.b64 && base64 -d /opt/smart_proxy/smart_proxy.b64 > /opt/smart_proxy/smart_proxy.py && systemctl restart smart_proxy' < /tmp/sp.b64"
stdin, stdout, stderr = c.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
