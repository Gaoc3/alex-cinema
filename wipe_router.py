import paramiko

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to OpenWrt Router for COMPLETE WIPEOUT...")
    client.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=10)
    
    commands = [
        # 1. Stop and disable Nginx proxy
        "/etc/init.d/nginx_proxy stop",
        "/etc/init.d/nginx_proxy disable",
        # 2. Delete Nginx config files
        "rm -f /etc/config/nginx_proxy.conf",
        "rm -f /tmp/nginx_proxy.conf",
        "rm -f /etc/init.d/nginx_proxy",
        
        # 3. Stop and disable SSH/Serveo tunnels
        "/etc/init.d/serveo_tunnel stop",
        "/etc/init.d/serveo_tunnel disable",
        "rm -f /etc/init.d/serveo_tunnel",
        
        "/etc/init.d/ssh_tunnel stop",
        "/etc/init.d/ssh_tunnel disable",
        "rm -f /etc/init.d/ssh_tunnel",
        
        # 4. Kill lingering processes
        "killall nginx",
        "killall ssh",
        
        # 5. Optional cleanup of temp files
        "rm -rf /tmp/nginx_error.log",
        "rm -rf /tmp/nginx.pid",
        "rm -rf /tmp/nginx_client_temp",
        "rm -rf /tmp/nginx_proxy_temp"
    ]
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        client.exec_command(cmd)
        
    print("All previous Nginx and SSH configs have been completely wiped from the router.")
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()
