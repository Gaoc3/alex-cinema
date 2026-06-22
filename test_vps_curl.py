import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = """dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -I -H 'Host: cndw2.shabakaty.com' -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' -H 'Referer: https://cinemana.shabakaty.com/' 'https://127.0.0.1:8083/vascin24-mp4/9E8C4E53-AD5B-B491-B5E6-9CDFC18BC13C_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=nU%2BGih6%2Fu972Y4t6tlxuMSUaRio%3D' -k" """
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
