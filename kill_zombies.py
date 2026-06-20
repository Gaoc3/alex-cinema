import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)
stdin, stdout, stderr = c.exec_command("dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'fuser -k -n tcp 8081; fuser -k -n tcp 8082; fuser -k -n tcp 8083; fuser -k -n tcp 8084'")
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
