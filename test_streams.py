import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -H \'Host: cinemana.shabakaty.com\' -H \'Accept: application/json\' -H \'User-Agent: Mozilla/5.0\' -H \'Referer: https://cinemana.shabakaty.com/\' \'https://127.0.0.1:8081/api/android/transcoddedFiles/id/1336019\' -k"'
stdin, stdout, stderr = ssh.exec_command(command)
out = stdout.read().decode(errors='replace')
print("STDOUT len:", len(out))
try:
    data = json.loads(out)
    if isinstance(data, list):
        for stream in data:
            print("STREAM:", stream.get('videoUrl'))
except Exception as e:
    print("JSON Error:", e)
    print("OUT START:", out[:500])
ssh.close()
