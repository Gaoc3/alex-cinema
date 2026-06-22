import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

# Test: Does direct curl to cndw2 tunnel with query string work properly via GET?
url = 'https://127.0.0.1:8083/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D'

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -v -H \'Host: cndw2.shabakaty.com\' -H \'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36\' -H \'Referer: https://cinemana.shabakaty.com/\' \'{url}\' -k -r 0-100 -o /dev/null 2>&1 | grep -E \'HTTP|<\' | head -30"'
stdin, stdout, stderr = ssh.exec_command(command)
out = stdout.read().decode(errors='replace')
print("OUTPUT:", out)
ssh.close()
