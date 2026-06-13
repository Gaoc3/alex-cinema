import paramiko
import sys

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

frpc_ini = """[common]
server_addr = 64.225.99.144
server_port = 7000
token = AlexCinemaSecretTunnel2026

[shabakaty-proxy]
type = http
local_port = 8080
local_ip = 127.0.0.1
custom_domains = cinemana-tunnel.local
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to OpenWrt Router...")
    client.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=10)
    
    # 1. Write the configuration file
    print("Writing /etc/frpc.ini...")
    client.exec_command(f"cat << 'EOF' > /etc/frpc.ini\n{frpc_ini}\nEOF")
    
    # 2. Try to install frpc via opkg
    print("Updating opkg and installing frpc...")
    stdin, stdout, stderr = client.exec_command("opkg update >/dev/null 2>&1 && opkg install frpc")
    out = stdout.read().decode('utf-8', errors='ignore')
    print("opkg output:", out)
    
    # 3. Create an init.d script to ensure it runs
    init_script = """#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1
PROG=/usr/bin/frpc

start_service() {
    procd_open_instance
    procd_set_param command $PROG -c /etc/frpc.ini
    procd_set_param respawn
    procd_close_instance
}
"""
    client.exec_command(f"cat << 'EOF' > /etc/init.d/frpc_tunnel\n{init_script}\nEOF")
    client.exec_command("chmod +x /etc/init.d/frpc_tunnel")
    
    # 4. Enable and start the service
    print("Starting frpc service...")
    client.exec_command("/etc/init.d/frpc_tunnel enable")
    client.exec_command("/etc/init.d/frpc_tunnel restart")
    
    print("Done! frpc should be running now.")

except Exception as e:
    print("Error:", e)
finally:
    client.close()
