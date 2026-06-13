import paramiko

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"
ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

print("Uploading to VPS...")
vps = paramiko.SSHClient()
vps.set_missing_host_key_policy(paramiko.AutoAddPolicy())
vps.connect(VPS_IP, username=VPS_USER, password=VPS_PASS)

sftp = vps.open_sftp()
sftp.put('vps_nginx.conf', '/etc/nginx/nginx.conf')
sftp.put('frpc_direct.ini', '/var/www/html/frpc.ini')
sftp.close()

vps.exec_command('systemctl restart nginx')
vps.close()

print("Restarting frpc on Router...")
router = paramiko.SSHClient()
router.set_missing_host_key_policy(paramiko.AutoAddPolicy())
router.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS)

router.exec_command('killall frpc; wget -q http://64.225.99.144/frpc.ini -O /tmp/frpc.ini; /tmp/frpc -c /tmp/frpc.ini > /tmp/frpc.log 2>&1 &')
router.close()
print("Done!")
