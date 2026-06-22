import paramiko
import base64

nginx_conf = """worker_processes auto;
events { worker_connections 4096; }

http {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    server {
        listen 80;
        listen 443 ssl;
        server_name 64-225-99-144.nip.io 64.225.99.144 _;

        ssl_certificate /etc/letsencrypt/live/64-225-99-144.nip.io/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/64-225-99-144.nip.io/privkey.pem;

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

b64_config = base64.b64encode(nginx_conf.encode('utf-8')).decode('utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001')

cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 \"echo '{b64_config}' | base64 -d > /etc/nginx/nginx.conf && systemctl restart nginx\""
stdin, stdout, stderr = c.exec_command(cmd)
print("OUT:", stdout.read().decode('utf-8', 'ignore'))
print("ERR:", stderr.read().decode('utf-8', 'ignore'))
c.close()
