import paramiko
import os

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

try:
    print("Connecting to VPS to upload configurations...")
    vps = paramiko.SSHClient()
    vps.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    vps.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=10)
    
    sftp = vps.open_sftp()
    sftp.put('vps_nginx.conf', '/etc/nginx/nginx.conf')
    sftp.put('frpc_direct.ini', '/var/www/html/frpc.ini')
    sftp.close()
    
    vps.exec_command('systemctl restart nginx')
    vps.exec_command('chmod 644 /var/www/html/frpc.ini')
    vps.close()
    
    print("Connecting to OpenWrt router to download and start frpc...")
    router = paramiko.SSHClient()
    router.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    router.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=30)
    
    router_cmd = """
    killall frpc
    wget -q http://64.225.99.144/frpc -O /tmp/frpc
    chmod +x /tmp/frpc
    wget -q http://64.225.99.144/frpc.ini -O /tmp/frpc.ini
    nohup /tmp/frpc -c /tmp/frpc.ini > /tmp/frpc.log 2>&1 &
    sleep 2
    ps | grep frpc | grep -v grep
    """
    
    stdin, stdout, stderr = router.exec_command(router_cmd)
    
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    print("Router Output:")
    print(out)
    if err:
        print("Router Error:", err)
        
    router.close()
    print("Done!")
except Exception as e:
    print("Exception:", e)
