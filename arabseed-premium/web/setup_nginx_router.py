import subprocess

def run(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', cmd], capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)

# 1. Stop old cinemana service to free port 8080 and stop lua script
run('/etc/init.d/cinemana stop; /etc/init.d/cinemana disable')

# 2. Setup Nginx Configuration
nginx_conf = """cat << 'EOF' > /tmp/nginx_proxy.conf
worker_processes  1;
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
        resolver 8.8.8.8 1.1.1.1;

        location /vascin24-mp4/ {
            proxy_pass https://cdn.shabakaty.com/vascin24-mp4/;
            proxy_ssl_server_name on;
            proxy_buffering off;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_set_header Host cdn.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            proxy_intercept_errors on;
            error_page 301 302 307 = @handle_redirect;
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

        location /api/ {
            proxy_pass https://cinemana.shabakaty.com/api/;
            proxy_ssl_server_name on;
            proxy_buffering off;
            proxy_set_header Host cinemana.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
        }

        location /vascin-poster-images/ {
            proxy_pass https://cnth2.shabakaty.com/vascin-poster-images/;
            proxy_ssl_server_name on;
            proxy_set_header Host cnth2.shabakaty.com;
        }

        location /vascin-cover-images/ {
            proxy_pass https://cnth2.shabakaty.com/vascin-cover-images/;
            proxy_ssl_server_name on;
            proxy_set_header Host cnth2.shabakaty.com;
        }

        location /m240/ {
            proxy_pass https://cndw2.shabakaty.com/m240/;
            proxy_ssl_server_name on;
            proxy_buffering off;
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;
            proxy_set_header Host cndw2.shabakaty.com;
            proxy_set_header Referer "https://cinemana.shabakaty.com/";
            
            proxy_intercept_errors on;
            error_page 301 302 307 = @handle_redirect;
        }
    }
}
EOF
"""
run(nginx_conf)

# 3. Create the new init.d script
init_script = """cat << 'EOF' > /etc/init.d/nginx_proxy
#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

start_service() {
    # Prepare tmp paths
    mkdir -p /tmp/usr /tmp/etc /tmp/lib /tmp/opkg-lists /tmp/nginx_client_temp /tmp/nginx_proxy_temp /tmp/nginx_fastcgi_temp /tmp/nginx_uwsgi_temp /tmp/nginx_scgi_temp

    # Setup opkg dest ram if missing
    if ! grep -q "dest ram /tmp" /etc/opkg.conf; then
        cp /etc/opkg.conf /tmp/opkg.conf
        sed -i 's|/var/opkg-lists|/tmp/opkg-lists|g' /tmp/opkg.conf
        echo 'dest ram /tmp' >> /tmp/opkg.conf
    fi

    # Install packages to RAM if not present
    if [ ! -f /tmp/usr/sbin/nginx ]; then
        opkg -f /tmp/opkg.conf update
        opkg -f /tmp/opkg.conf --dest ram install nginx-ssl openssh-client
    fi

    # Start Nginx
    procd_open_instance "nginx"
    procd_set_param env LD_LIBRARY_PATH="/tmp/usr/lib:/tmp/lib"
    procd_set_param command /tmp/usr/sbin/nginx -c /tmp/nginx_proxy.conf -g "daemon off;"
    procd_set_param respawn
    procd_close_instance

    # Start SSH Tunnel using Serveo for a stable subdomain
    procd_open_instance "ssh_tunnel"
    procd_set_param env LD_LIBRARY_PATH="/tmp/usr/lib:/tmp/lib"
    procd_set_param command /tmp/usr/libexec/ssh-openssh -i /etc/config/serveo_rsa -o StrictHostKeyChecking=no -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R cinemanamtsky001:80:127.0.0.1:8080 serveo.net
    procd_set_param respawn
    procd_close_instance
}
EOF
"""
run(init_script)

# 4. Enable and start the service
run('chmod +x /etc/init.d/nginx_proxy; /etc/init.d/nginx_proxy enable; /etc/init.d/nginx_proxy restart')

print("Deployment triggered. You can check localhost.run URL by looking at the logs.")
