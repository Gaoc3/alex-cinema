import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

commands = [
    "systemctl stop pyproxy || true",
    "systemctl disable pyproxy || true",
    "rm -f /etc/systemd/system/pyproxy.service",
    "systemctl daemon-reload",
    "systemctl stop nginx || true",
    "systemctl disable nginx || true",
    "docker rm -f frps || true",
    "rm -rf /opt/frps",
    "sed -i '/shabakaty.com/d' /etc/hosts",
    "echo '127.0.0.1 cinemana.shabakaty.com cdn.shabakaty.com cndw1.shabakaty.com cndw2.shabakaty.com cndw3.shabakaty.com cndw4.shabakaty.com cndw5.shabakaty.com cnth1.shabakaty.com cnth2.shabakaty.com cnth3.shabakaty.com' >> /etc/hosts",
    "mkdir -p /opt/frps",
    "echo -e 'bindPort = 7000\\nauth.method = \"token\"\\nauth.token = \"EarthlinkCinemanaSecureToken\"' > /opt/frps/frps.toml",
    "echo -e 'version: \"3.3\"\\nservices:\\n  frps:\\n    image: snowdreamtech/frps:latest\\n    restart: always\\n    network_mode: \"host\"\\n    volumes:\\n      - ./frps.toml:/etc/frp/frps.toml' > /opt/frps/docker-compose.yml",
    "cd /opt/frps && docker-compose up -d"
]

for cmd in commands:
    print(f"Running: {cmd}")
    # Wrap in base64 to avoid quote escaping issues via dbclient
    import base64
    b64_cmd = base64.b64encode(cmd.encode('utf-8')).decode('utf-8')
    remote_cmd = f"echo '{b64_cmd}' | base64 -d | dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'sh -s'"
    
    stdin, stdout, stderr = ssh.exec_command(remote_cmd)
    
    # Wait for command to complete
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    
    if out:
        print(f"STDOUT: {out}")
    if err:
        print(f"STDERR: {err}")
    if exit_status != 0:
        print(f"WARNING: Command exited with {exit_status}")

print("VPS SETUP COMPLETE!")
ssh.close()
