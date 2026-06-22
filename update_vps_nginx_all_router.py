import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

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

    location / {
        return 404;
    }
}
"""

encoded = base64.b64encode(nginx_conf.encode()).decode()

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "echo {encoded} | base64 -d > /etc/nginx/sites-available/default && nginx -t && systemctl reload nginx"'

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode())
print("STDERR:\n", stderr.read().decode())
ssh.close()
