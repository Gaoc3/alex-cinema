import paramiko
import time

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"

print("Uploading to VPS...")
vps = paramiko.SSHClient()
vps.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps.connect(VPS_IP, username=VPS_USER, password=VPS_PASS)

# Create Cache Directories
vps.exec_command('mkdir -p /var/cache/nginx/images /var/cache/nginx/api /var/cache/nginx/video')
vps.exec_command('chown -R www-data:www-data /var/cache/nginx')

sftp = vps.open_sftp()
sftp.put('vps_nginx.conf', '/etc/nginx/nginx.conf')
sftp.close()

stdin, stdout, stderr = vps.exec_command('nginx -t')
exit_status = stdout.channel.recv_exit_status()
if exit_status == 0:
    vps.exec_command('systemctl restart nginx')
    print("Nginx configuration successfully applied and restarted.")
else:
    print("Nginx config test failed:")
    print(stderr.read().decode())

vps.close()
