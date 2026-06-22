import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

# Test cdn (8082) with the exact video URL and signature and Host: cdn.shabakaty.com
command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -v -k -H \'Host: cdn.shabakaty.com\' -H \'Referer: https://cinemana.shabakaty.com/\' -H \'User-Agent: Mozilla/5.0\' \'https://127.0.0.1:8082/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D\' | head -n 20"'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode('ascii', errors='replace'))
print("STDERR:", stderr.read().decode('ascii', errors='replace'))
ssh.close()
