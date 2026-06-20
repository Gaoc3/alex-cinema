import paramiko
import os
import time

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = "grep -r proxy.lua /etc/"
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print("STDOUT:", out)
    print("STDERR:", err)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
