import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

commands = [
    "mkdir -p /opt/frp",
    "cd /opt/frp && curl -sSLO https://github.com/fatedier/frp/releases/download/v0.56.0/frp_0.56.0_linux_amd64.tar.gz",
    "cd /opt/frp && tar -xzf frp_0.56.0_linux_amd64.tar.gz",
    "cp /opt/frp/frp_0.56.0_linux_amd64/frps /usr/local/bin/frps",
    "mkdir -p /etc/frp",
    "echo 'bindPort = 7000' > /etc/frp/frps.toml",
    "echo 'auth.method = \"token\"' >> /etc/frp/frps.toml",
    "echo 'auth.token = \"EarthlinkCinemanaSecureToken\"' >> /etc/frp/frps.toml",
    "echo '[Unit]' > /etc/systemd/system/frps.service",
    "echo 'Description=Frp Server Service' >> /etc/systemd/system/frps.service",
    "echo 'After=network.target' >> /etc/systemd/system/frps.service",
    "echo '[Service]' >> /etc/systemd/system/frps.service",
    "echo 'Type=simple' >> /etc/systemd/system/frps.service",
    "echo 'Restart=on-failure' >> /etc/systemd/system/frps.service",
    "echo 'RestartSec=5s' >> /etc/systemd/system/frps.service",
    "echo 'ExecStart=/usr/local/bin/frps -c /etc/frp/frps.toml' >> /etc/systemd/system/frps.service",
    "echo 'LimitNOFILE=1048576' >> /etc/systemd/system/frps.service",
    "echo '[Install]' >> /etc/systemd/system/frps.service",
    "echo 'WantedBy=multi-user.target' >> /etc/systemd/system/frps.service",
    "systemctl daemon-reload",
    "systemctl enable frps",
    "systemctl restart frps",
    "systemctl status frps --no-pager"
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

print("FRP SETUP COMPLETE!")
ssh.close()
