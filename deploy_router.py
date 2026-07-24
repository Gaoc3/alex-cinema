import paramiko
import time

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

print("Connecting to OpenWrt Router...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=15)

with open('router_setup_l4.sh', 'r', encoding='utf-8') as f:
    content = f.read()

print("Writing setup script to /tmp/router_setup_l4.sh...")
# Write the script via stdin
cmd = "cat > /tmp/router_setup_l4.sh"
stdin, stdout, stderr = ssh.exec_command(cmd)
stdin.write(content.encode('utf-8'))
stdin.close()
stdout.read() # Wait for it to finish writing

print("Executing Router setup script...")
stdin, stdout, stderr = ssh.exec_command("sh /tmp/router_setup_l4.sh")
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')
print("STDOUT:", out)
print("STDERR:", err)

ssh.close()
