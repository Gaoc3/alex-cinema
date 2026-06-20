import paramiko
import os
import sys
import traceback

sys.stdout.reconfigure(encoding='utf-8')

def deploy():
    try:
        print("Connecting to router...")
        with open('ai_proxy_manager.py', 'r', encoding='utf-8') as f:
            ai_script = f.read()
            
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

        print("Uploading AI Proxy Manager to router via stdin...")
        stdin, stdout, stderr = c.exec_command('cat > /tmp/ai_proxy_manager.py')
        stdin.write(ai_script.encode('utf-8'))
        stdin.close()
        stdout.channel.recv_exit_status()
        
        service_file = """[Unit]
Description=AI Proxy Manager Self-Healing Engine
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /root/ai_proxy_manager.py
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ai_proxy_manager

[Install]
WantedBy=multi-user.target
"""
        stdin, stdout, stderr = c.exec_command('cat > /tmp/ai-proxy-manager.service')
        stdin.write(service_file.encode('utf-8'))
        stdin.close()
        stdout.channel.recv_exit_status()

        print("Copying files from router to VPS...")
        cmd1 = "scp -i /etc/dropbear/id_rsa /tmp/ai_proxy_manager.py root@64.225.99.144:/root/ai_proxy_manager.py"
        stdin1, stdout1, stderr1 = c.exec_command(cmd1)
        stdout1.channel.recv_exit_status()
        
        cmd2 = "scp -i /etc/dropbear/id_rsa /tmp/ai-proxy-manager.service root@64.225.99.144:/etc/systemd/system/ai-proxy-manager.service"
        stdin2, stdout2, stderr2 = c.exec_command(cmd2)
        stdout2.channel.recv_exit_status()

        print("Restarting service on VPS...")
        cmd3 = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'chmod +x /root/ai_proxy_manager.py && systemctl daemon-reload && systemctl enable ai-proxy-manager && systemctl restart ai-proxy-manager'"
        stdin3, stdout3, stderr3 = c.exec_command(cmd3)
        stdout3.channel.recv_exit_status()
        
        print("Done!")
        print("STDOUT:", stdout3.read().decode('utf-8', errors='ignore'))
        print("STDERR:", stderr3.read().decode('utf-8', errors='ignore'))
        
    except Exception as e:
        print("Error:")
        traceback.print_exc()

deploy()
