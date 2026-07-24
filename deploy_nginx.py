import paramiko

VPS_IP = "64.225.99.144"

# Read the new nginx config
with open("new_nginx.conf", "r") as f:
    nginx_content = f.read()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.1.1", username="root", password="punisher001", timeout=15)

# Write the new nginx.conf to VPS
# Use SFTP via paramiko
transport = ssh.get_transport()
sftp_chan = transport.open_session()
sftp_chan.exec_command(f"dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} 'cat > /tmp/nginx_new.conf'")
sftp_chan.sendall(nginx_content.encode())
sftp_chan.shutdown_write()
sftp_chan.recv(1024)
sftp_chan.close()

# Now test the new config and reload
stdin, stdout, stderr = ssh.exec_command(f"dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} 'nginx -t -c /tmp/nginx_new.conf 2>&1'")
test_out = stdout.read().decode('utf-8', errors='ignore')
test_err = stderr.read().decode('utf-8', errors='ignore')
print("nginx -t:", test_out, test_err)

ssh.close()
