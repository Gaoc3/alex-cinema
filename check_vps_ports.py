import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('64.225.99.144', username='root', password='Mtsky1STgg', timeout=10)
    
    commands = [
        "netstat -tlpn | grep 8080",
        "ss -tlpn | grep 8080",
        "cat /etc/systemd/system/autossh.service",
        "cat /etc/systemd/system/ssh-tunnel.service"
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
