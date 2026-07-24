import paramiko
def check():
    vps_ip = "64.225.99.144"
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("192.168.1.1", username="root", password="punisher001", timeout=30)
    
    cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@{vps_ip} 'cat /etc/nginx/sites-available/default || cat /etc/nginx/nginx.conf'"
    stdout = ssh.exec_command(cmd)[1].read().decode('utf-8', errors='replace')
    with open('nginx_conf.txt', 'w', encoding='utf-8') as f:
        f.write(stdout)
    ssh.close()
if __name__ == "__main__":
    check()
