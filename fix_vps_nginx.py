import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

nginx_conf = """
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name 64-225-99-144.nip.io 64.225.99.144 _;

    ssl_certificate /etc/letsencrypt/live/64-225-99-144.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/64-225-99-144.nip.io/privkey.pem;

    # Shared CORS block
    proxy_hide_header Content-Disposition;
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "*" always;

    proxy_ssl_server_name on;
    proxy_ssl_protocols TLSv1.2 TLSv1.3;
    proxy_http_version 1.1;
    proxy_set_header Connection "";

    location /cdn/ {
        if ($request_method = OPTIONS ) {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "*" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        proxy_pass https://127.0.0.1:8082/;
        proxy_set_header Host "cdn.shabakaty.com";
        proxy_ssl_name "cdn.shabakaty.com";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header Accept "*/*";
    }

    location /cndw2/ {
        if ($request_method = OPTIONS ) {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "*" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        proxy_pass https://127.0.0.1:8083/;
        proxy_set_header Host "cndw2.shabakaty.com";
        proxy_ssl_name "cndw2.shabakaty.com";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header Accept "*/*";
    }

    location /cnth2/ {
        if ($request_method = OPTIONS ) {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "*" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        proxy_pass https://127.0.0.1:8084/;
        proxy_set_header Host "cnth2.shabakaty.com";
        proxy_ssl_name "cnth2.shabakaty.com";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header Accept "*/*";
    }

    location /cinemana/ {
        if ($request_method = OPTIONS ) {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "*" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        proxy_pass https://127.0.0.1:8081/;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header Accept "*/*";
    }

    location / {
        proxy_pass https://127.0.0.1:8081;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header Accept "*/*";
    }
}
"""

remote_python = f"""
import os
with open('/etc/nginx/sites-available/default', 'w') as f:
    f.write({repr(nginx_conf)})
os.system('nginx -t && systemctl reload nginx')
"""

encoded_python = base64.b64encode(remote_python.encode()).decode()

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "python3 -c \\"import base64; exec(base64.b64decode(\'{encoded_python}\'))\\""'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
