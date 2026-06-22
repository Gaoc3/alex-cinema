import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = "wget -qS --no-check-certificate -O - 'https://cdn.shabakaty.com/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D' 2>&1 | head -n 20"
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode(errors='ignore'))
ssh.close()
