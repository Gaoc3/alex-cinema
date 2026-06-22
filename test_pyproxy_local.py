import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

# The exact same URL I passed to Nginx
url = 'http://127.0.0.1:8085/cndw2/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D'

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -v \'{url}\' -r 0-1000 -I"'
stdin, stdout, stderr = ssh.exec_command(command)
out = stdout.read().decode(errors='replace')
err = stderr.read().decode(errors='replace')
print("STDOUT:", out)
print("STDERR:", err)
ssh.close()
