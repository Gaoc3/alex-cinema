import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

cmd = "wget -qO- --no-check-certificate https://cinemana.shabakaty.com/vascin-poster-images/BA8FD4D8-D049-458D-67F4-640DF9F0AC67_poster.png | wc -c"
stdin, stdout, stderr = c.exec_command(cmd)

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
