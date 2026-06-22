import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

command = """dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "curl -v 'http://127.0.0.1/cnth2/vascin-poster-images/55CFF932-647E-CB72-9392-206AD2F0FA82_poster.jpg'" """
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
