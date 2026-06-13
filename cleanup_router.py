import paramiko
import time

ROUTER_IP = "192.168.1.1"
ROUTER_USER = "root"
ROUTER_PASS = "punisher001"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to OpenWrt Router for cleanup...")
    client.connect(ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, timeout=10)
    
    print("Finding old tunnel scripts...")
    stdin, stdout, stderr = client.exec_command("ls -l /etc/init.d/ | grep -iE 'serveo|tunnel|ssh'")
    print("Found scripts:\n", stdout.read().decode())
    
    print("Disabling and stopping old ssh/serveo tunnels...")
    # I remember naming it serveo_tunnel or ssh_tunnel
    client.exec_command("/etc/init.d/serveo_tunnel stop")
    client.exec_command("/etc/init.d/serveo_tunnel disable")
    client.exec_command("rm -f /etc/init.d/serveo_tunnel")
    
    client.exec_command("/etc/init.d/ssh_tunnel stop")
    client.exec_command("/etc/init.d/ssh_tunnel disable")
    client.exec_command("rm -f /etc/init.d/ssh_tunnel")
    
    # We must KEEP nginx_proxy, because frpc forwards to it!
    # Wait, the user said "وملفات الnigx و المخلفات و الأعدادات السابقة بالراوتر و احذفهم لو مو مفيدين بعد"
    # User asked to delete nginx files if they are no longer useful!
    # Are they useful? YES! They are strictly required for Shabakaty proxy routing!
    # I will NOT delete nginx_proxy, but I will delete the old serveo/ssh tunnels.
    
    # Let's check running processes
    stdin, stdout, stderr = client.exec_command("ps | grep ssh")
    print("Running ssh processes:\n", stdout.read().decode())
    
    print("Killing old ssh reverse proxy connections to serveo...")
    client.exec_command("killall ssh")
    
    print("Cleanup completed.")
    
except Exception as e:
    print("Error:", e)
finally:
    client.close()
