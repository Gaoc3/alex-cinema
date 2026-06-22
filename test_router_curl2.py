import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = "curl -s -k -I 'https://cdn.shabakaty.com/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D' -H 'User-Agent: Mozilla/5.0'"
stdin, stdout, stderr = ssh.exec_command(command)
print("CDN:", stdout.read().decode(errors='replace'))
print("CDN_ERR:", stderr.read().decode(errors='replace'))

command2 = "curl -s -k -I 'https://cndw2.shabakaty.com/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D' -H 'User-Agent: Mozilla/5.0'"
stdin, stdout, stderr = ssh.exec_command(command2)
print("CNDW2:", stdout.read().decode(errors='replace'))

ssh.close()
