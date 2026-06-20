import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001')
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -s -k -I -H \"Host: cinemana.shabakaty.com\" \"https://127.0.0.1:8081/vascin24-posters/123.jpg\"'"
stdin, stdout, stderr = c.exec_command(cmd)
print(stdout.read().decode('utf-8', 'ignore'))
print(stderr.read().decode('utf-8', 'ignore'))
c.close()
