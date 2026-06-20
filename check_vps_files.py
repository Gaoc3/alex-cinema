import paramiko

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'ls -la /root; cat /root/proxy.js; cat /root/server.js; pm2 list'"
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore')
    print("STDOUT:\n" + out)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
