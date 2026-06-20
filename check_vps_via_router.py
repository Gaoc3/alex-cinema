import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    stdin, stdout, stderr = client.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -o /dev/null -w \'%{http_code}\' -k -H \'Host: cnth2.shabakaty.com\' https://127.0.0.1:8084/vascin-poster-images/F39DF4F9-C132-B833-2559-6F1BBEEAA17D.jpg"')
    print(stdout.read().decode())
except Exception as e:
    print(e)
finally:
    client.close()
