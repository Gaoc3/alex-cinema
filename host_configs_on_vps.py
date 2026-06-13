import paramiko

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"

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
client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=10)
sftp = client.open_sftp()
with sftp.file('/var/www/html/nginx_proxy.conf', 'w') as f:
    f.write(nginx_conf)
with sftp.file('/var/www/html/frpc.ini', 'w') as f:
    f.write(frpc_ini)
sftp.close()
client.exec_command("chmod 644 /var/www/html/nginx_proxy.conf /var/www/html/frpc.ini")
client.close()
print("Uploaded config files to VPS.")
