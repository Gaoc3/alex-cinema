import paramiko
import base64
import time

def run_dbclient_cmd(ssh, cmd_str):
    encoded = base64.b64encode(cmd_str.encode()).decode()
    cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 \"echo '{encoded}' | base64 -d | sh\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='ignore'), stderr.read().decode('utf-8', errors='ignore')

def restore_vps_and_router():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('192.168.1.1', username='root', password='punisher001', timeout=15)
    
    with open('pyproxy_new.py', 'rb') as f:
        pyproxy_content = f.read()
    pyproxy_encoded = base64.b64encode(pyproxy_content).decode()
    
    # Send pyproxy file
    cmd1 = f"echo '{pyproxy_encoded}' | base64 -d > /opt/pyproxy.py"
    run_dbclient_cmd(ssh, cmd1)
    
    # Create systemd service
    service_content = """[Unit]
Description=Python Aiohttp Proxy
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/pyproxy.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
"""
    service_encoded = base64.b64encode(service_content.encode()).decode()
    cmd2 = f"echo '{service_encoded}' | base64 -d > /etc/systemd/system/pyproxy.service && systemctl daemon-reload && systemctl enable pyproxy && systemctl restart pyproxy"
    run_dbclient_cmd(ssh, cmd2)

    # Nginx
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
    }

    location / {
        return 404;
    }
}
"""
    nginx_encoded = base64.b64encode(nginx_conf.encode()).decode()
    cmd3 = f"echo '{nginx_encoded}' | base64 -d > /etc/nginx/sites-available/default && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx"
    out, err = run_dbclient_cmd(ssh, cmd3)
    print("VPS NGINX STDOUT:", out)
    print("VPS NGINX STDERR:", err)

    # Router setup
    sh_script = """#!/bin/sh
while true; do
    dbclient -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 -R 8085:cndw1.shabakaty.com:443 -R 8086:cndw3.shabakaty.com:443 -R 8087:cndw4.shabakaty.com:443 -R 8088:cndw5.shabakaty.com:443 -R 8089:cnth1.shabakaty.com:443 -R 8090:cnth3.shabakaty.com:443 -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 -N
    sleep 5
done
"""
    ssh.exec_command(f"cat << 'EOF' > /root/start_tunnel.sh\n{sh_script}EOF")
    ssh.exec_command("chmod +x /root/start_tunnel.sh")
    
    ssh.exec_command("killall dbclient; killall start_tunnel.sh")
    time.sleep(2)
    ssh.exec_command("/root/start_tunnel.sh > /dev/null 2>&1 &")
    
    print("Restore complete.")
    ssh.close()

if __name__ == '__main__':
    restore_vps_and_router()
