import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

cmd = "wget -qO- --no-check-certificate https://cnth2.shabakaty.com/vascin-poster-images/EECD5734-CD72-85D5-A37C-52C917F73B94_poster_medium_thumb.jpg | wc -c"
stdin, stdout, stderr = c.exec_command(cmd)

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
