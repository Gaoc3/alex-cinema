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
    "echo 'bindPort = 7000' > /opt/frps/frps.toml",
    "echo 'auth.method = \"token\"' >> /opt/frps/frps.toml",
    "echo 'auth.token = \"EarthlinkCinemanaSecureToken\"' >> /opt/frps/frps.toml",
    "echo 'version: \"3.3\"' > /opt/frps/docker-compose.yml",
    "echo 'services:' >> /opt/frps/docker-compose.yml",
    "echo '  frps:' >> /opt/frps/docker-compose.yml",
    "echo '    image: snowdreamtech/frps:latest' >> /opt/frps/docker-compose.yml",
    "echo '    restart: always' >> /opt/frps/docker-compose.yml",
    "echo '    network_mode: \"host\"' >> /opt/frps/docker-compose.yml",
    "echo '    volumes:' >> /opt/frps/docker-compose.yml",
    "echo '      - ./frps.toml:/etc/frp/frps.toml' >> /opt/frps/docker-compose.yml",
    "cd /opt/frps && docker-compose up -d"
]

for cmd in commands:
    print(f"Running: {cmd}")
    # Escape single quotes
    escaped_cmd = cmd.replace("'", "'\\''")
    remote_cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 '{escaped_cmd}'"
    
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
