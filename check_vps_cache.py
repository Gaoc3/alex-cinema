import paramiko
import os

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = """
dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'ls -la /var/cache/nginx; du -sh /var/cache/nginx; find /var/cache/nginx -type f | wc -l; cat /etc/nginx/sites-enabled/default'
"""
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    with open('vps_cache_check.txt', 'w', encoding='utf-8') as f:
        f.write("STDOUT:\n" + out + "\nSTDERR:\n" + err)
    print("VPS cache check saved to vps_cache_check.txt")
except Exception as e:
    print(f"Failed to connect or execute: {e}")
