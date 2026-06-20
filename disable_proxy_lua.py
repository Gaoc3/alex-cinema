import paramiko
import os
import time

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = """
/etc/init.d/cinemana stop
/etc/init.d/cinemana disable
rm -f /etc/config/proxy.lua
rm -f /etc/init.d/cinemana
killall lua
"""
    stdin, stdout, stderr = c.exec_command(cmd)

    time.sleep(2)

    stdin, stdout, stderr = c.exec_command("ps | grep lua")
    out = stdout.read().decode('utf-8', errors='ignore')
    print("STDOUT:", out)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
