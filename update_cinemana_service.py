import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to Router (192.168.1.1)...")
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=15)
    
    # 1. Clean up rc.local
    rc_local_content = """#!/bin/sh
exit 0
"""

    # 2. Update /etc/init.d/cinemana to use the requested dbclient setup
    cinemana_content = """#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

start_service() {
    procd_open_instance "cinemana_proxy"
    procd_set_param command lua /etc/config/proxy.lua
    procd_set_param respawn
    procd_close_instance

    procd_open_instance "cinemana_tunnel"
    procd_set_param command dbclient -y -y -c chacha20-poly1305@openssh.com -W 4194304 -K 60 -I 0 -i /etc/dropbear/id_rsa -N -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 root@64.225.99.144
    procd_set_param respawn 3600 5 0
    procd_close_instance
}
"""
    
    commands = [
        "killall dbclient",
        f"cat << 'EOF' > /etc/rc.local\n{rc_local_content}\nEOF",
        f"cat << 'EOF' > /etc/init.d/cinemana\n{cinemana_content}\nEOF",
        "chmod +x /etc/init.d/cinemana",
        "/etc/init.d/cinemana enable",
        "/etc/init.d/cinemana start",
        "sleep 3",
        "ps | grep dbclient"
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
