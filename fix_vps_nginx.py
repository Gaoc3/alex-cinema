import paramiko
import base64

new_nginx_conf = """worker_processes auto;
events { worker_connections 4096; }

http {
    # Define cache zones
    proxy_cache_path /var/cache/nginx/images levels=1:2 keys_zone=img_cache:10m max_size=10g inactive=30d use_temp_path=off;
    proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=15m use_temp_path=off;
    proxy_cache_path /var/cache/nginx/video levels=1:2 keys_zone=video_cache:10m max_size=40g inactive=7d use_temp_path=off;

    # Common Proxy Headers
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Main server for frontend API requests
    server {
        listen 80;
        server_name 64.225.99.144;

        location ~ ^/vascin[0-9]+-mp4 {
            proxy_pass https://127.0.0.1:8082;
            proxy_ssl_server_name on;
            proxy_ssl_name cdn.shabakaty.com;
            proxy_set_header Host cdn.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            # Cache settings for video segments / large files
            proxy_cache video_cache;
            proxy_cache_valid 200 206 7d;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_lock on;
            add_header X-Cache-Status $upstream_cache_status;
        }

        location ~ ^/m[0-9]+ {
            proxy_pass https://127.0.0.1:8083;
            proxy_ssl_server_name on;
            proxy_ssl_name cndw2.shabakaty.com;
            proxy_set_header Host cndw2.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            # Use Slice module to cache MP4 in 1MB chunks
            slice 1m;
            proxy_set_header Range $slice_range;
            proxy_cache video_cache;
            proxy_cache_key $uri$is_args$args$slice_range;
            proxy_cache_valid 200 206 7d;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_lock on;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Fix: Route vascin-poster-images to cdn.shabakaty.com (8082) instead of cnth2
        location ~ ^/(uploads|poster|cover|vascin-poster-images|vascin-cover-images)/ {
            proxy_pass https://127.0.0.1:8082;
            proxy_ssl_server_name on;
            proxy_ssl_name cdn.shabakaty.com;
            proxy_set_header Host cdn.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            # Image Cache
            proxy_cache img_cache;
            proxy_cache_valid 200 30d;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_lock on;
            proxy_ignore_headers Cache-Control Expires;
            add_header X-Cache-Status $upstream_cache_status;
        }

        location /vascin-translation-files/ {
            proxy_pass https://127.0.0.1:8084;
            proxy_ssl_server_name on;
            proxy_ssl_name cnth2.shabakaty.com;
            proxy_set_header Host cnth2.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            proxy_cache api_cache;
            proxy_cache_valid 200 1d;
            proxy_cache_lock on;
            proxy_ignore_headers Cache-Control Expires;
            add_header X-Cache-Status $upstream_cache_status;
        }

        location /vascin-staff-poster/ {
            proxy_pass https://127.0.0.1:8081;
            proxy_ssl_server_name on;
            proxy_ssl_name cinemana.shabakaty.com;
            proxy_set_header Host cinemana.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            proxy_cache img_cache;
            proxy_cache_valid 200 30d;
            proxy_cache_lock on;
            proxy_ignore_headers Cache-Control Expires;
            add_header X-Cache-Status $upstream_cache_status;
        }

        location /api/ {
            proxy_pass https://127.0.0.1:8081;
            proxy_ssl_server_name on;
            proxy_ssl_name cinemana.shabakaty.com;
            proxy_set_header Host cinemana.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            # API Cache
            proxy_cache api_cache;
            proxy_cache_valid 200 15m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_lock on;
            proxy_ignore_headers Cache-Control Expires;
            add_header X-Cache-Status $upstream_cache_status;
        }

        location /assetsUI/ {
            proxy_pass https://127.0.0.1:8081;
            proxy_ssl_server_name on;
            proxy_ssl_name cinemana.shabakaty.com;
            proxy_set_header Host cinemana.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            # Image Cache for UI assets
            proxy_cache img_cache;
            proxy_cache_valid 200 30d;
            proxy_cache_lock on;
            proxy_ignore_headers Cache-Control Expires;
            add_header X-Cache-Status $upstream_cache_status;
        }
        
        location /frpc {
            alias /var/www/html/frpc;
        }
    }
}
"""

b64_conf = base64.b64encode(new_nginx_conf.encode('utf-8')).decode('utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    
    cmd = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "echo \'{b64_conf}\' | base64 -d > /etc/nginx/nginx.conf && systemctl restart nginx"'
    stdin, stdout, stderr = client.exec_command(cmd)
    
    print("STDOUT:", stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("ERR:", err)
except Exception as e:
    print(e)
finally:
    client.close()
