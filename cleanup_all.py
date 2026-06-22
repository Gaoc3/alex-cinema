import paramiko
import base64

def run_router_and_vps_cleanup():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect('192.168.1.1', username='root', password='punisher001', timeout=15)
        
        # VPS Cleanup via dbclient
        vps_script = """
systemctl stop pyproxy 2>/dev/null || true
systemctl disable pyproxy 2>/dev/null || true
rm -f /etc/systemd/system/pyproxy.service
systemctl daemon-reload
killall python3 2>/dev/null || true
killall frps 2>/dev/null || true
killall frpc 2>/dev/null || true
rm -f /root/pyproxy.py
rm -f /root/pyproxy_new.py
rm -f /opt/pyproxy.py
rm -rf /etc/frp
rm -f /root/frps
rm -rf /tmp/frp*
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default
rm -f /etc/nginx/sites-enabled/pyproxy
rm -f /etc/nginx/sites-available/pyproxy
systemctl restart nginx 2>/dev/null || true
"""
        encoded_vps_script = base64.b64encode(vps_script.encode()).decode()
        
        vps_cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 \"echo '{encoded_vps_script}' | base64 -d | sh\""
        
        print("Executing VPS Cleanup via router dbclient...")
        stdin, stdout, stderr = ssh.exec_command(vps_cmd)
        print("VPS STDOUT:", stdout.read().decode('utf-8', errors='ignore'))
        print("VPS STDERR:", stderr.read().decode('utf-8', errors='ignore'))

        # Router Cleanup
        router_script = """
killall python3 2>/dev/null || true
killall frpc 2>/dev/null || true
killall dbclient 2>/dev/null || true
killall start_tunnel.sh 2>/dev/null || true
killall frps 2>/dev/null || true
rm -f /root/router_proxy.py
rm -f /root/proxy.log
rm -f /root/frpc.log
rm -rf /etc/frp
rm -f /etc/init.d/frpc
rm -f /root/start_tunnel.sh
rm -f /root/frpc
rm -rf /tmp/frp*
rm -f /tmp/router_proxy.py
sed -i '/start_tunnel.sh/d' /etc/crontabs/root 2>/dev/null || true
/etc/init.d/cron restart 2>/dev/null || true
sed -i '/start_tunnel.sh/d' /etc/rc.local 2>/dev/null || true
sed -i '/router_proxy.py/d' /etc/rc.local 2>/dev/null || true
sed -i '/frpc/d' /etc/rc.local 2>/dev/null || true
sync && echo 3 > /proc/sys/vm/drop_caches
"""
        print("Executing Router Cleanup...")
        stdin, stdout, stderr = ssh.exec_command(router_script)
        print("Router STDOUT:", stdout.read().decode('utf-8', errors='ignore'))
        print("Router STDERR:", stderr.read().decode('utf-8', errors='ignore'))

    except Exception as e:
        print(f"Connection/Execution Error: {e}")
    finally:
        ssh.close()

run_router_and_vps_cleanup()
