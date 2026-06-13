import paramiko

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    client.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=10)
    sftp = client.open_sftp()
    
    print("Uploading BIG ENDIAN frpc to VPS /var/www/html/frpc...")
    sftp.put('frp_0.58.0_linux_mips/frpc', '/var/www/html/frpc')
    sftp.close()
    
    client.exec_command("chmod 644 /var/www/html/frpc")
    print("Success! Big-endian frpc is hosted!")
except Exception as e:
    print("Error:", e)
finally:
    client.close()
