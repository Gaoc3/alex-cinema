import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

# Use a transport channel to write the file directly via stdin
transport = ssh.get_transport()
channel = transport.open_session()
channel.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "cat > /opt/pyproxy.py"')

with open('pyproxy_new.py', 'rb') as f:
    data = f.read()

channel.sendall(data)
channel.shutdown_write()  # Signal EOF

time.sleep(3)
out = channel.recv(4096).decode(errors='replace')
err = channel.recv_stderr(4096).decode(errors='replace')
print("OUT:", out)
print("ERR:", err)
channel.close()

# Restart pyproxy
stdin2, stdout2, stderr2 = ssh.exec_command(
    'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "systemctl restart pyproxy && sleep 2 && systemctl is-active pyproxy"'
)
out2 = stdout2.read().decode(errors='replace')
err2 = stderr2.read().decode(errors='replace')
print("Restart:", out2)
print("Restart err:", err2)

ssh.close()
