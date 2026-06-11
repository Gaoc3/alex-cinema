import paramiko
import sys
import time
import base64

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    
    # Get current config
    stdin, stdout, stderr = client.exec_command('cat /tmp/nginx_proxy.conf')
    config = stdout.read().decode('utf-8')
    
    if '/vascin-translation-files/' not in config:
        # Insert the new blocks before @handle_redirect
        new_blocks = """
        location /vascin-translation-files/ {
            proxy_pass https://cinemana.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_set_header Host cinemana.shabakaty.com;
        }

        location /vascin-staff-poster/ {
            proxy_pass https://cinemana.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_set_header Host cinemana.shabakaty.com;
        }

        location /assetsUI/ {
            proxy_pass https://cinemana.shabakaty.com;
            proxy_ssl_server_name on;
            proxy_set_header Host cinemana.shabakaty.com;
        }
"""
        config = config.replace('location @handle_redirect', new_blocks + '        location @handle_redirect')
        
        # Write it back using base64 to avoid escaping issues
        b64_config = base64.b64encode(config.encode('utf-8')).decode('utf-8')
        command = f"echo '{b64_config}' | base64 -d > /tmp/nginx_proxy.conf"
        client.exec_command(command)
        
        time.sleep(1)
        
        # Restart nginx
        stdin, stdout, stderr = client.exec_command('/etc/init.d/nginx_proxy restart')
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        time.sleep(2)
        print("Nginx config updated and service restarted successfully!")
        print(out)
        if err: print("ERR:", err)
    else:
        print('Routes already exist in config.')
except Exception as e:
    print(f'Error: {e}')
finally:
    client.close()
