import paramiko
import base64
import os

VPS_IP = '64.225.99.144'
ROUTER_IP = '192.168.1.1'
ROUTER_USER = 'root'
ROUTER_PASS = 'punisher001'

with open('smart_proxy.py', 'r', encoding='utf-8') as f:
    proxy_script_content = f.read()

proxy_b64 = base64.b64encode(proxy_script_content.encode('utf-8')).decode('utf-8')

smart_proxy_service = """[Unit]
Description=Smart Proxy Engine
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/smart_proxy/smart_proxy.py
WorkingDirectory=/opt/smart_proxy
Restart=always
User=root

[Install]
WantedBy=multi-user.target
"""
service_b64 = base64.b64encode(smart_proxy_service.encode('utf-8')).decode('utf-8')

nginx_proxy_conf = """worker_processes auto;
events { worker_connections 4096; }

http {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    server {
        listen 80;
        server_name 64.225.99.144;

        # Bypass smart proxy for API endpoints and use Nginx SNI directly
        location /api/android/ {
            proxy_pass https://127.0.0.1:8081;
            proxy_set_header Host cinemana.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_ssl_name cinemana.shabakaty.com;
        }

        # Use smart proxy for media files
        location / {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
"""
nginx_b64 = base64.b64encode(nginx_proxy_conf.encode('utf-8')).decode('utf-8')

commands = [
    # 1. Install dependencies
    f'dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} "apt-get update && apt-get install -y python3-aiohttp"',
    
    # 2. Setup directory and files
    f'dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} "mkdir -p /opt/smart_proxy && echo \'{proxy_b64}\' | base64 -d > /opt/smart_proxy/smart_proxy.py"',
    f'dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} "echo \'{service_b64}\' | base64 -d > /etc/systemd/system/smart_proxy.service"',
    f'dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} "echo \'{nginx_b64}\' | base64 -d > /etc/nginx/nginx.conf"',
    
    # 3. Reload and Restart
    f'dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} "systemctl daemon-reload && systemctl restart smart_proxy && systemctl enable smart_proxy"',
    f'dbclient -y -y -i /etc/dropbear/id_rsa root@{VPS_IP} "systemctl restart nginx"'
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to Router {ROUTER_IP}...")
    client.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=10)
    
    for cmd in commands:
        print(f"Running: {cmd[:100]}...")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        out = stdout.read().decode()
        err = stderr.read().decode()
        
        if out: print("STDOUT:", out)
        if err: print("STDERR:", err)
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
