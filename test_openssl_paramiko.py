import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "echo -e \\"GET / HTTP/1.1\\\\r\\\\nHost: cndw2.shabakaty.com\\\\r\\\\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\\\\r\\\\n\\\\r\\\\n\\" | openssl s_client -connect 127.0.0.1:8083 -servername cndw2.shabakaty.com -quiet 2>/dev/null"'

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode(errors='ignore')[:1000])
print("STDERR:\n", stderr.read().decode(errors='ignore')[:1000])
ssh.close()
