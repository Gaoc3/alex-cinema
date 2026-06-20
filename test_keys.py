import paramiko

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'python3 -c \"import json; data=json.load(open(\\'/tmp/video.json\\')); print(list(data.keys()))\"'"
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore').strip()
    print("STDOUT:\n" + out)
        
except Exception as e:
    print(f"Failed to connect or execute: {e}")
