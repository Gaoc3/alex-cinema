import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -I http://127.0.0.1/cdn/vascin24-mp4/96427C70-1AC5-7B1E-3BA5-D66324ACC5F2_video.mp4'"
stdin, stdout, stderr = c.exec_command(cmd)
print('STDOUT:', stdout.read().decode('utf-8'))
print('STDERR:', stderr.read().decode('utf-8'))
