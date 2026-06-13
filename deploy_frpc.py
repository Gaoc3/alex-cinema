import paramiko
import time

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
    
    print("Writing /tmp/frpc.ini...")
    client.exec_command(f"cat << 'EOF' > /tmp/frpc.ini\n{frpc_ini}\nEOF")
    
    print("Downloading and extracting frpc directly to RAM (/tmp) to save space...")
    cmd = "wget -qO- https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_mipsle.tar.gz | tar -xzO frp_0.58.0_linux_mipsle/frpc > /tmp/frpc"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Wait for completion
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print("Failed to download mipsle. Trying mips (big endian)...")
        cmd_mips = "wget -qO- https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_mips.tar.gz | tar -xzO frp_0.58.0_linux_mips/frpc > /tmp/frpc"
        client.exec_command(cmd_mips)
        
    client.exec_command("chmod +x /tmp/frpc")
    
    print("Killing any existing frpc processes...")
    client.exec_command("killall frpc")
    time.sleep(1)
    
    print("Starting frpc in the background...")
    client.exec_command("nohup /tmp/frpc -c /tmp/frpc.ini > /tmp/frpc.log 2>&1 &")
    
    # Check if it's running
    time.sleep(2)
    stdin, stdout, stderr = client.exec_command("ps | grep frpc | grep -v grep")
    running = stdout.read().decode()
    if running:
        print("SUCCESS! frpc is running on the router:\n" + running)
    else:
        print("FAILED to start frpc. Check /tmp/frpc.log.")
        stdin, stdout, stderr = client.exec_command("cat /tmp/frpc.log")
        print("LOG:", stdout.read().decode())
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()
