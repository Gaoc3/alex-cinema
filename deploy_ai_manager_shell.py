import paramiko
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

def deploy():
    print("Connecting to router...")
    with open('ai_proxy_manager.py', 'r', encoding='utf-8') as f:
        ai_script = f.read()
        
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    print("Uploading AI Proxy Manager to VPS via router shell...")
    
    # Use single quotes around the script content, but wait, the script contains single quotes!
    # A safer way is to use a heredoc or just base64!
    import base64
    b64 = base64.b64encode(ai_script.encode('utf-8')).decode('utf-8')
    
    # We execute a single command that pushes it directly to the VPS!
    # No, command line length limit! Let's write to router first using dd or chunks!
    
    channel = c.invoke_shell()
    
    # Read prompt
    import time
    time.sleep(1)
    print(channel.recv(1024).decode())
    
    channel.send("cat << 'EOF_MARKER' > /tmp/ai_proxy_manager.py\n")
    channel.send(ai_script)
    channel.send("\nEOF_MARKER\n")
    
    time.sleep(2)
    print("Uploaded to router. Now transferring to VPS...")
    
    channel.send("cat /tmp/ai_proxy_manager.py | dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'cat > /root/ai_proxy_manager.py'\n")
    time.sleep(2)
    
    print("Restarting service on VPS...")
    channel.send("dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'chmod +x /root/ai_proxy_manager.py && systemctl daemon-reload && systemctl enable ai-proxy-manager && systemctl restart ai-proxy-manager'\n")
    time.sleep(2)
    
    print(channel.recv(65535).decode('utf-8', errors='ignore'))
    c.close()

deploy()
