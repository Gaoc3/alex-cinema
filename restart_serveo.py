import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to Router (192.168.1.1)...")
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    
    commands = [
        "ps | grep dbclient",
        "cat /tmp/tunnel_serveo.log",
        "/etc/init.d/rc.local restart || sh /etc/rc.local"
    ]
    
    for cmd in commands:
        print(f"\n--- {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print("STDOUT:\n", stdout.read().decode())
        print("STDERR:\n", stderr.read().decode())
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
