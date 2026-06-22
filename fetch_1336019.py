import paramiko, json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -H \'Host: cinemana.shabakaty.com\' https://127.0.0.1:8081/api/android/allVideoInfo/id/1336019 -k"'
stdin, stdout, stderr = ssh.exec_command(command)
out = stdout.read().decode('utf-8', 'ignore')

print("=== allVideoInfo ===")
print("Is valid JSON?", out.startswith("{") or out.startswith("["))
try:
    data = json.loads(out)
    if isinstance(data, dict):
        print("Title:", data.get('en_title'), "/", data.get('ar_title'))
        print("File:", data.get('fileFile'))
except Exception as e:
    print("Error parsing JSON:", e)

command2 = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -H \'Host: cinemana.shabakaty.com\' https://127.0.0.1:8081/api/android/transcoddedFiles/id/1336019 -k"'
stdin, stdout, stderr = ssh.exec_command(command2)
out2 = stdout.read().decode('utf-8', 'ignore')

print("\n=== transcoddedFiles ===")
try:
    data2 = json.loads(out2)
    print("Streams length:", len(data2) if isinstance(data2, list) else data2)
    if isinstance(data2, list) and len(data2) > 0:
        for s in data2:
            print(f"Res: {s.get('resolution')}, URL: {s.get('videoUrl')}")
except Exception as e:
    print("Error parsing JSON:", e)

ssh.close()
