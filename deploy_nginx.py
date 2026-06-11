import paramiko

config_lines = [
    "worker_processes  1;",
    "error_log /tmp/nginx_error.log;",
    "pid /tmp/nginx.pid;",
    "",
    "events {",
    "    worker_connections  1024;",
    "}",
    "",
    "http {",
    "    access_log off;",
    "    client_body_temp_path /tmp/nginx_client_temp;",
    "    proxy_temp_path /tmp/nginx_proxy_temp;",
    "    fastcgi_temp_path /tmp/nginx_fastcgi_temp;",
    "    uwsgi_temp_path /tmp/nginx_uwsgi_temp;",
    "    scgi_temp_path /tmp/nginx_scgi_temp;",
    "",
    "    server {",
    "        listen 8080;",
    "        server_name localhost;",
    "        resolver 8.8.8.8 1.1.1.1;",
    "",
    "        location ~ ^/vascin[0-9]+-mp4 {",
    "            proxy_pass https://cdn.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_buffering off;",
    "            proxy_set_header Range $http_range;",
    "            proxy_set_header If-Range $http_if_range;",
    "            proxy_set_header Host cdn.shabakaty.com;",
    "            proxy_set_header Referer \"https://cinemana.shabakaty.com/\";",
    "            proxy_intercept_errors on;",
    "            error_page 301 302 307 = @handle_redirect;",
    "        }",
    "",
    "        location ~ ^/m[0-9]+ {",
    "            proxy_pass https://cndw2.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_buffering off;",
    "            proxy_set_header Range $http_range;",
    "            proxy_set_header If-Range $http_if_range;",
    "            proxy_set_header Host cndw2.shabakaty.com;",
    "            proxy_set_header Referer \"https://cinemana.shabakaty.com/\";",
    "            proxy_intercept_errors on;",
    "            error_page 301 302 307 = @handle_redirect;",
    "        }",
    "",
    "        location /api/ {",
    "            proxy_pass https://cinemana.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_buffering off;",
    "            proxy_set_header Host cinemana.shabakaty.com;",
    "            proxy_set_header Referer \"https://cinemana.shabakaty.com/\";",
    "        }",
    "",
    "        location /uploads/images/ {",
    "            proxy_pass https://cdn.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_set_header Host cdn.shabakaty.com;",
    "        }",
    "",
    "        location /vascin-poster-images/ {",
    "            proxy_pass https://cnth2.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_set_header Host cnth2.shabakaty.com;",
    "        }",
    "",
    "        location /vascin-cover-images/ {",
    "            proxy_pass https://cnth2.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_set_header Host cnth2.shabakaty.com;",
    "        }",
    "",
    "        location /vascin-translation-files/ {",
    "            proxy_pass https://cnth2.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_set_header Host cnth2.shabakaty.com;",
    "        }",
    "",
    "        location /vascin-staff-poster/ {",
    "            proxy_pass https://cinemana.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_set_header Host cinemana.shabakaty.com;",
    "        }",
    "",
    "        location /assetsUI/ {",
    "            proxy_pass https://cinemana.shabakaty.com;",
    "            proxy_ssl_server_name on;",
    "            proxy_set_header Host cinemana.shabakaty.com;",
    "        }",
    "",
    "        location @handle_redirect {",
    "            resolver 8.8.8.8 1.1.1.1 ipv6=off;",
    "            set $saved_redirect_location '$upstream_http_location';",
    "            proxy_pass $saved_redirect_location;",
    "            proxy_ssl_server_name on;",
    "            proxy_buffering off;",
    "            proxy_set_header Range $http_range;",
    "            proxy_set_header If-Range $http_if_range;",
    "            proxy_set_header Referer \"https://cinemana.shabakaty.com/\";",
    "        }",
    "    }",
    "}"
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    
    # Empty file first
    client.exec_command("echo '' > /tmp/nginx_proxy.conf")
    
    for line in config_lines:
        escaped_line = line.replace('$', '\\$').replace('"', '\\"')
        client.exec_command(f'echo "{escaped_line}" >> /tmp/nginx_proxy.conf')

    # Restart nginx
    stdin, stdout, stderr = client.exec_command('/etc/init.d/nginx_proxy restart')
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    print("Nginx config rebuilt and service restarted successfully!")
    print(out)
    if err: print("ERR:", err)
except Exception as e:
    print(f'Error: {e}')
finally:
    client.close()
