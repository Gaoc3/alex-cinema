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

    location / {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Disable proxy buffering for video streams!
        proxy_buffering off;
    }
}
"""

encoded_conf = base64.b64encode(nginx_conf.encode()).decode()

cmd_setup = f"""dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "
# Change pyproxy port back to 8080
sed -i 's/port=80/port=8080/g' /opt/pyproxy.py
systemctl restart pyproxy

python3 -c \\"import base64; open('/etc/nginx/sites-available/default', 'w').write(base64.b64decode('{encoded_conf}').decode())\\"
systemctl enable nginx
systemctl start nginx
systemctl restart nginx
"
"""

stdin, stdout, stderr = ssh.exec_command(cmd_setup)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
