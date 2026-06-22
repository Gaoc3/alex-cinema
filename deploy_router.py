import paramiko
import base64

with open('router_proxy.py', 'rb') as f:
    router_proxy_content = f.read().decode('utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

# Write router_proxy.py directly
print("Writing router_proxy.py...")
escaped_proxy = router_proxy_content.replace("'", "'\\''")
ssh.exec_command(f"echo '{escaped_proxy}' > /root/router_proxy.py")

commands = [
    "opkg update",
    "opkg install frpc",
    "mkdir -p /etc/frp",
    "echo 'serverAddr = \"64.225.99.144\"' > /etc/frp/frpc.toml",
    "echo 'serverPort = 7000' >> /etc/frp/frpc.toml",
    "echo 'auth.method = \"token\"' >> /etc/frp/frpc.toml",
    "echo 'auth.token = \"EarthlinkCinemanaSecureToken\"' >> /etc/frp/frpc.toml",
    "echo '' >> /etc/frp/frpc.toml",
    "echo '[[proxies]]' >> /etc/frp/frpc.toml",
    "echo 'name = \"cinemana\"' >> /etc/frp/frpc.toml",
    "echo 'type = \"tcp\"' >> /etc/frp/frpc.toml",
    "echo 'localIP = \"127.0.0.1\"' >> /etc/frp/frpc.toml",
    "echo 'localPort = 8080' >> /etc/frp/frpc.toml",
    "echo 'remotePort = 8080' >> /etc/frp/frpc.toml",
    "killall python3 || true",
    "python3 /root/router_proxy.py &> /root/proxy.log &",
    "/etc/init.d/frpc enable || true",
    "/etc/init.d/frpc start || true",
    "frpc -c /etc/frp/frpc.toml &> /root/frpc.log &"
]

for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    if out: print(f"STDOUT: {out}")
    if err: print(f"STDERR: {err}")
    if exit_status != 0: print(f"WARNING: Command exited with {exit_status}")

print("ROUTER SETUP COMPLETE!")
ssh.close()
