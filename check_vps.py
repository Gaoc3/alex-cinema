import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('64.225.99.144', username='root', password='Mtsky1STgg', timeout=10)
    
    commands = [
        "ps aux | grep -i node",
        "ps aux | grep -i python",
        "ls -la /var/www /opt /usr/local/bin /home",
        "cat /etc/nginx/sites-enabled/default",
        "cat /etc/nginx/nginx.conf"
    ]
    
    for cmd in commands:
        print(f"\n--- {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print("STDOUT:\n", stdout.read().decode())
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
