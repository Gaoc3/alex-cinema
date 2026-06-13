import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to VPS (64.225.99.144)...")
    client.connect('64.225.99.144', username='root', password='Mtsky1STgg', timeout=10)
    
    commands = [
        "ss -tlpn | grep sshd"
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
