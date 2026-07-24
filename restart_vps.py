import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('64.225.99.144', username='root', password='punisher001')

# Run pm2 restart
stdin, stdout, stderr = ssh.exec_command('pm2 restart cinemana > /root/pm2_restart.log 2>&1')
stdout.channel.recv_exit_status() # Wait for completion
ssh.close()
print("Restart triggered")
