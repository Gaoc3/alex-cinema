import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -v -H \'Host: cndw2.shabakaty.com\' -H \'User-Agent: Mozilla/5.0\' -H \'Referer: https://cinemana.shabakaty.com/\' \'https://127.0.0.1:8083/vascin24-mp4/201/2/c7e8e57ee5b14299b9cf255df27d0b47/c7e8e57ee5b14299b9cf255df27d0b47_480.mp4\' -k -I"'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode(errors='replace'))
print("STDERR:", stderr.read().decode(errors='replace'))
ssh.close()
