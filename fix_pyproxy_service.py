import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "sed -i \'s/ExecStart=\\/usr\\/bin\\/python3 \\/opt\\/pyproxy.py/ExecStart=\\/usr\\/bin\\/python3 -u \\/opt\\/pyproxy.py/g\' /etc/systemd/system/pyproxy.service && systemctl daemon-reload && systemctl restart pyproxy"'

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
ssh.close()
