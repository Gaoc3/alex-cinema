import paramiko
import os
import time

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = """
echo "=== UPTIME ==="
uptime
echo "=== MEMORY ==="
free
echo "=== CPU LOAD ==="
top -n 1 -b | head -n 15
echo "=== DMESG ==="
dmesg | tail -n 20
echo "=== LOGREAD ==="
logread | tail -n 30
"""
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')

    with open('router_diag.txt', 'w', encoding='utf-8') as f:
        f.write("STDOUT:\n" + out + "\nSTDERR:\n" + err)
    print("Diagnostics saved to router_diag.txt")
except Exception as e:
    print(f"Failed to connect or execute: {e}")
