import paramiko
import json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -s -H \"bypass-tunnel-reminder: true\" http://127.0.0.1:8000/api/android/banner/level/1'"
stdin, stdout, stderr = c.exec_command(cmd)

data = stdout.read().decode('utf-8')
try:
    j = json.loads(data)
    with open('banner_output.json', 'w', encoding='utf-8') as f:
        json.dump(j, f, indent=2, ensure_ascii=False)
except Exception as e:
    with open('banner_output.json', 'w', encoding='utf-8') as f:
        f.write(data)
