import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -s -v -k -H \'Host: cndw2.shabakaty.com\' -H \'User-Agent: Mozilla/5.0\' \'https://127.0.0.1:8083/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4\' > /tmp/cndw2_resp.bin 2> /tmp/cndw2_err.txt; cat /tmp/cndw2_err.txt; echo \'DATA HEAD:\'; head -c 100 /tmp/cndw2_resp.bin"'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode('ascii', errors='replace'))
ssh.close()
