import paramiko
import os

# Step 1: SSH into router, then SCP to VPS
# We need to upload the file from Windows -> Router -> VPS

ssh_router = paramiko.SSHClient()
ssh_router.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh_router.connect('192.168.1.1', username='root', password='punisher001')

# Read the file locally
with open('pyproxy_new.py', 'r') as f:
    content = f.read()

# Escape the content for shell -- use a here-doc approach written to router's /tmp
# Then scp from router to VPS
lines = content.replace("'", "'\\''")  # escape single quotes for shell

# Write the file to the router's /tmp first using cat heredoc
write_to_router_cmd = f"cat > /tmp/pyproxy_new.py << 'PYEOF'\n{content}\nPYEOF"

stdin, stdout, stderr = ssh_router.exec_command(write_to_router_cmd)
print("Write to router:", stdout.read().decode(errors='replace'))
print("Write err:", stderr.read().decode(errors='replace'))

# SCP from router to VPS
scp_cmd = 'scp -o StrictHostKeyChecking=no -i /etc/dropbear/id_rsa /tmp/pyproxy_new.py root@64.225.99.144:/opt/pyproxy.py'
stdin2, stdout2, stderr2 = ssh_router.exec_command(scp_cmd)
print("SCP:", stdout2.read().decode(errors='replace'))
print("SCP err:", stderr2.read().decode(errors='replace'))

# Restart pyproxy on VPS
restart_cmd = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "systemctl restart pyproxy && sleep 2 && systemctl is-active pyproxy"'
stdin3, stdout3, stderr3 = ssh_router.exec_command(restart_cmd)
print("Restart:", stdout3.read().decode(errors='replace'))
print("Restart err:", stderr3.read().decode(errors='replace'))

ssh_router.close()
