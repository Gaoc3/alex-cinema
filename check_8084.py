import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -k -H \"Host: cnth2.shabakaty.com\" https://127.0.0.1:8084/vascin-poster-images/EECD5734-CD72-85D5-A37C-52C917F73B94_poster_medium_thumb.jpg | wc -c'"
stdin, stdout, stderr = c.exec_command(cmd)

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
