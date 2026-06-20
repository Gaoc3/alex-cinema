import paramiko
import traceback
import sys

sys.stdout.reconfigure(encoding='utf-8')

def deploy():
    try:
        print("Connecting to VPS directly...")
        with open('ai_proxy_manager.py', 'r', encoding='utf-8') as f:
            ai_script = f.read()
            
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect('64.225.99.144', username='root', password='Mtsky1STgg', timeout=10)

        print("Uploading AI Proxy Manager to VPS via SFTP...")
        sftp = c.open_sftp()
        sftp.put('ai_proxy_manager.py', '/root/ai_proxy_manager.py')
        
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
        with open('ai-proxy-manager.service', 'w', encoding='utf-8') as f:
            f.write(service_file)
        
        sftp.put('ai-proxy-manager.service', '/etc/systemd/system/ai-proxy-manager.service')
        sftp.close()

        print("Restarting service on VPS...")
        cmd3 = "chmod +x /root/ai_proxy_manager.py && systemctl daemon-reload && systemctl enable ai-proxy-manager && systemctl restart ai-proxy-manager"
        stdin3, stdout3, stderr3 = c.exec_command(cmd3)
        stdout3.channel.recv_exit_status()
        
        print("Done!")
        print("STDOUT:", stdout3.read().decode('utf-8', errors='ignore'))
        print("STDERR:", stderr3.read().decode('utf-8', errors='ignore'))
        
    except Exception as e:
        print("Error:")
        traceback.print_exc()

deploy()
