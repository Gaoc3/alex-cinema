import paramiko
import time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to Router (192.168.1.1)...")
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=15)
    
    cmd = "killall dbclient; dbclient -y -y -c chacha20-poly1305@openssh.com -W 4194304 -K 60 -I 0 -i /etc/dropbear/id_rsa -N -f -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 root@64.225.99.144; ps | grep dbclient"
    
    print(f"\n--- {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Wait for completion
    time.sleep(3)
    
    print("STDOUT:\n", stdout.read().decode())
    print("STDERR:\n", stderr.read().decode())
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
