import paramiko

nginx_config = """
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cinemanacache:50m max_size=5g inactive=12h use_temp_path=off;

server {
    listen 80 default_server;
    server_name _;
    
    # Route Video Streams to the CDN Tunnel (8084 -> cnth2.shabakaty.com:443)
    location /video/ {
        proxy_pass https://127.0.0.1:8084;
        proxy_set_header Host "cnth2.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cnth2.shabakaty.com";
        proxy_ssl_verify off;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Don't cache huge video streams heavily, just buffer
        proxy_buffering off;
    }

    # Route Everything else (API, images) to the Cinemana Tunnel (8081 -> cinemana.shabakaty.com:443)
    location / {
        proxy_pass https://127.0.0.1:8081;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_ssl_verify off;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Caching logic
        proxy_cache cinemanacache;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        
        proxy_buffering on;
    }
}
"""

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    escaped_config = nginx_config.replace('$', '\\$').replace('"', '\\"')
    cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'cat << \"EOF\" > /etc/nginx/sites-available/default\n{nginx_config}\nEOF\nsystemctl restart nginx'"
    
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print("STDOUT:\n" + out)
    print("STDERR:\n" + err)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
