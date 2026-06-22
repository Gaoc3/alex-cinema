import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('64.225.99.144', username='root', password='punisher001')

nginx_conf = """
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cinemanacache:50m max_size=5g inactive=12h use_temp_path=off;

server {
    listen 80 default_server;
    server_name _;
    
    location ~ ^/(cdn|cndw[0-9]+|cnth[0-9]+|cinemana)/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        
        # Add basic CORS headers for preflight requests if needed
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Everything else (like /, /api, etc) goes to 8080 too if needed?
    # Wait, the proxy only handles those subdomains. If someone hits / directly, return 404
    location / {
        return 404;
    }
}
"""

command = "cat << 'EOF' > /etc/nginx/sites-available/default\n" + nginx_conf + "\nEOF\nnginx -t && systemctl reload nginx"
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
ssh.close()
