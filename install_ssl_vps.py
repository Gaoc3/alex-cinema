import paramiko
import base64

install_ssl_script = """
#!/bin/bash
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Configure Nginx server_name so Certbot knows which block to modify
sed -i 's/server_name _;/server_name 64-225-99-144.nip.io;/g' /etc/nginx/sites-available/default
systemctl reload nginx

# Request certificate
certbot --nginx -d 64-225-99-144.nip.io --non-interactive --agree-tos -m admin@alex-cinema.com --redirect
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

b64_script = base64.b64encode(install_ssl_script.encode('utf-8')).decode('utf-8')
cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'echo {b64_script} | base64 -d > /tmp/install_ssl.sh && chmod +x /tmp/install_ssl.sh && /tmp/install_ssl.sh'"
stdin, stdout, stderr = c.exec_command(cmd)

print('STDOUT:\\n', stdout.read().decode('utf-8'))
print('STDERR:\\n', stderr.read().decode('utf-8'))
