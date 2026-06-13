import paramiko
import os

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

nginx_conf = """worker_processes  1;
error_log /tmp/nginx_error.log;
pid /tmp/nginx.pid;

events {
    worker_connections  1024;
}

http {
    access_log off;
    client_body_temp_path /tmp/nginx_client_temp;
    proxy_temp_path /tmp/nginx_proxy_temp;
    fastcgi_temp_path /tmp/nginx_fastcgi_temp;
    uwsgi_temp_path /tmp/nginx_uwsgi_temp;
    scgi_temp_path /tmp/nginx_scgi_temp;

    server {
        listen 8080;
        server_name localhost;
        resolver 8.8.8.8 1.1.1.1 ipv6=off;

        location ~ ^/vascin[0-9]+-mp4 {
            proxy_pass https://cdn.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_buffering off;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_set_header Host cdn.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            proxy_intercept_errors on;
            error_page 301 302 307 = @handle_redirect;
        }

        location ~ ^/m[0-9]+ {
            proxy_pass https://cndw2.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_buffering off;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_set_header Host cndw2.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            proxy_intercept_errors on;
            error_page 301 302 307 = @handle_redirect;
        }

        location /api/ {
            proxy_pass https://cinemana.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_set_header Host cinemana.shabakaty.com;
        }

        location /assetsUI/ {
            proxy_pass https://cinemana.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_set_header Host cinemana.shabakaty.com;
        }

        location @handle_redirect {
            resolver 8.8.8.8 1.1.1.1 ipv6=off;
            set $saved_redirect_location '$upstream_http_location';
            proxy_pass $saved_redirect_location;
            proxy_ssl_server_name on;
            proxy_buffering off;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
        }
    }
}
"""

frpc_ini = """[common]
server_addr = 64.225.99.144
server_port = 7000
token = AlexCinemaSecretTunnel2026

[shabakaty-proxy]
type = http
local_port = 8080
local_ip = 127.0.0.1
custom_domains = cinemana-tunnel.local
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to OpenWrt Router...")
    client.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=10)
    sftp = client.open_sftp()
    
    print("Uploading Nginx configuration...")
    with sftp.file('/tmp/nginx_proxy.conf', 'w') as f:
        f.write(nginx_conf)
        
    print("Uploading frpc configuration...")
    with sftp.file('/tmp/frpc.ini', 'w') as f:
        f.write(frpc_ini)
        
    print("Uploading frpc binary (this may take a few seconds)...")
    sftp.put('frp_0.58.0_linux_mipsle/frpc', '/tmp/frpc')
    client.exec_command("chmod +x /tmp/frpc")
    
    sftp.close()
    
    print("Restarting Nginx proxy service...")
    client.exec_command("killall nginx")
    client.exec_command("/usr/sbin/nginx -c /tmp/nginx_proxy.conf")
    
    print("Killing old frpc processes...")
    client.exec_command("killall frpc")
    
    print("Starting new frpc service...")
    client.exec_command("nohup /tmp/frpc -c /tmp/frpc.ini > /tmp/frpc.log 2>&1 &")
    
    print("Success! The router has been completely configured and services are running!")
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()
