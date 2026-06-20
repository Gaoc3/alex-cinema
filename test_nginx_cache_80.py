import paramiko
import os
import time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

# First fetch an image through NGINX
c.exec_command("dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'curl -s -o /dev/null \"http://127.0.0.1/vascin-poster-images/EECD5734-CD72-85D5-A37C-52C917F73B94_poster_medium_thumb.jpg?test=caching_test123\"'")
time.sleep(2)

# Now check the cache directory
cmd = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'ls -la /var/cache/nginx'"
stdin, stdout, stderr = c.exec_command(cmd)

print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
