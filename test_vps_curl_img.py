import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = """dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -v -H 'Host: cnth2.shabakaty.com' -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' -H 'Referer: https://cinemana.shabakaty.com/' 'https://127.0.0.1:8084/vascin-poster-images/55CFF932-647E-CB72-9392-206AD2F0FA82_poster.jpg' -k" """
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode()[:1000])
print("STDERR:", stderr.read().decode()[:1000])
ssh.close()
