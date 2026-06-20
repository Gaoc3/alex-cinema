import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    stdin, stdout, stderr = client.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -o /dev/null -w \'%{http_code}\' http://127.0.0.1:8000/vascin-poster-images/F39DF4F9-C132-B833-2559-6F1BBEEAA17D.jpg"')
    out = stdout.read().decode('utf-8', 'ignore')
    print("STATUS:", out.strip())
except Exception as e:
    print(e)
finally:
    client.close()
