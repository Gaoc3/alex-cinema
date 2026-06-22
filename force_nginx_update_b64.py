import paramiko
import base64

nginx_config = """proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cinemanacache:50m max_size=5g inactive=12h use_temp_path=off;

server {
    listen 80 default_server;
    listen 443 ssl;
    server_name 64-225-99-144.nip.io _;
    
    ssl_certificate /etc/letsencrypt/live/64-225-99-144.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/64-225-99-144.nip.io/privkey.pem;

    proxy_redirect ~^https?://([^.]+)\\.shabakaty\\.com/(.*)$ /$1/$2;
    
    location ~ ^/(?:cdn|cndw2|cnth[0-9]+)/(.*) {
        proxy_pass https://127.0.0.1:8084/$1$is_args$args;
        proxy_set_header Host "cnth2.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cnth2.shabakaty.com";
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        proxy_buffering off;
    }

    location /cinemana/ {
        proxy_pass https://127.0.0.1:8081/;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        
        proxy_cache cinemanacache;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_buffering on;
    }

    location / {
        proxy_pass https://127.0.0.1:8081;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        proxy_buffering on;
    }
}
"""

b64_config = base64.b64encode(nginx_config.encode('utf-8')).decode('utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001')

cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 \"echo '{b64_config}' | base64 -d > /etc/nginx/sites-available/default && systemctl reload nginx\""
stdin, stdout, stderr = c.exec_command(cmd)
print("OUT:", stdout.read().decode('utf-8', 'ignore'))
print("ERR:", stderr.read().decode('utf-8', 'ignore'))
c.close()
