import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

sshd_changes = """
echo 'MaxSessions 500' >> /etc/ssh/sshd_config
echo 'MaxStartups 100:30:500' >> /etc/ssh/sshd_config
echo 'GatewayPorts yes' >> /etc/ssh/sshd_config
echo 'TCPKeepAlive yes' >> /etc/ssh/sshd_config
echo 'ClientAliveInterval 60' >> /etc/ssh/sshd_config
echo 'ClientAliveCountMax 3' >> /etc/ssh/sshd_config
systemctl restart ssh
"""

stdin, stdout, stderr = c.exec_command(f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "{sshd_changes}"')
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
