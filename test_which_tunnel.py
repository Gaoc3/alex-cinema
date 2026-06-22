import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = """dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -o /tmp/img_cdn.jpg -H 'Host: cdn.shabakaty.com' -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://cinemana.shabakaty.com/' 'https://127.0.0.1:8082/vascin-poster-images/55CFF932-647E-CB72-9392-206AD2F0FA82_poster.jpg' -k; file /tmp/img_cdn.jpg; curl -s -o /tmp/img_cnth2.jpg -H 'Host: cnth2.shabakaty.com' -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://cinemana.shabakaty.com/' 'https://127.0.0.1:8084/vascin-poster-images/55CFF932-647E-CB72-9392-206AD2F0FA82_poster.jpg' -k; file /tmp/img_cnth2.jpg" """

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
