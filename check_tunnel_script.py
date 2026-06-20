import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
cmd = "cat /root/start_tunnel.sh"
stdin, stdout, stderr = c.exec_command(cmd)
print('STDOUT:\n', stdout.read().decode('utf-8'))
print('STDERR:\n', stderr.read().decode('utf-8'))
