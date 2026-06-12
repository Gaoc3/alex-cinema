import paramiko
import time

HOST = "64.225.99.144"
USER = "root"
PASS = "Mtsky1STgg"

commands = [
    # 1. Update and install prerequisites
    "apt update -y",
    "DEBIAN_FRONTEND=noninteractive apt upgrade -y",
    "apt install nginx wget tar ufw -y",
    
    # 2. Download and install FRP
    "wget -O frp.tar.gz https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_amd64.tar.gz",
    "tar -zxvf frp.tar.gz",
    "cp frp_0.58.0_linux_amd64/frps /usr/local/bin/",
    "mkdir -p /etc/frp",
    
    # 3. Create frps.ini configuration
    """cat << 'EOF' > /etc/frp/frps.ini
[common]
bind_port = 7000
token = AlexCinemaSecretTunnel2026
vhost_http_port = 8080
EOF""",
    
    # 4. Create Systemd service for FRP Server
    """cat << 'EOF' > /etc/systemd/system/frps.service
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/frps -c /etc/frp/frps.ini
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF""",
    
    # 5. Enable and start FRP
    "systemctl daemon-reload",
    "systemctl enable frps",
    "systemctl restart frps",
    
    # 6. Configure Nginx to proxy to FRP
    """cat << 'EOF' > /etc/nginx/sites-available/default
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cinemanacache:50m max_size=5g inactive=12h use_temp_path=off;

server {
    listen 80 default_server;
    server_name _;
    
    # We will accept any requests and route them to the FRP tunnel
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host "cinemana-tunnel.local"; # This MUST match frpc.ini custom_domains
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Caching logic
        proxy_cache cinemanacache;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        
        # For large video files
        proxy_buffering off;
    }
}
EOF""",
    
    # 7. Restart Nginx
    "mkdir -p /var/cache/nginx",
    "systemctl restart nginx",
    
    # 8. Setup basic firewall
    "ufw allow 22/tcp",
    "ufw allow 80/tcp",
    "ufw allow 7000/tcp",
    "ufw --force enable",
]

def run_ssh():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, username=USER, password=PASS, timeout=10)
        print("Connected! Running setup commands...")
        
        for cmd in commands:
            print(f"Running: {cmd.splitlines()[0]}...")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            if exit_status != 0:
                print(f"Error ({exit_status}): {err}")
            else:
                print("Success")
                
        print("VPS Setup Complete!")
    except Exception as e:
        print(f"Failed to connect or execute: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    run_ssh()
