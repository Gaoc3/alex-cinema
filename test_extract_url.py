import paramiko

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -s -k -H \"Host: cinemana.shabakaty.com\" https://127.0.0.1:8081/api/android/videoInfo/id/3084827 > /tmp/video.json && python3 -c \"import json; data=json.load(open(\\'/tmp/video.json\\')); print([t[\\'url\\'] for t in data.get(\\'translations\\', []) if \\'mp4\\' in t[\\'url\\']])\"'"
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore').strip()
    print("STDOUT:\n" + out)
        
except Exception as e:
    print(f"Failed to connect or execute: {e}")
