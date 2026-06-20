import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)
stdin, stdout, stderr = c.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "wget -qO- --no-check-certificate https://127.0.0.1:8081/api/android/banner/level/1 | wc -c"')
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
