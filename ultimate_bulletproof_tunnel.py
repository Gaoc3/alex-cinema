import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

wrapper_script = """#!/bin/sh
while true; do
    logger -t cinemana_tunnel "Killing any zombie sshd processes on VPS..."
    dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'fuser -k -n tcp 8081; fuser -k -n tcp 8082; fuser -k -n tcp 8083; fuser -k -n tcp 8084'
    
    logger -t cinemana_tunnel "Starting dbclient tunnel..."
    dbclient -y -y -c chacha20-poly1305@openssh.com -W 4194304 -K 30 -I 600 -o ExitOnForwardFailure=yes -i /etc/dropbear/id_rsa -N -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 root@64.225.99.144
    
    logger -t cinemana_tunnel "dbclient tunnel exited. Restarting in 10 seconds..."
    sleep 10
done
"""

stdin, stdout, stderr = c.exec_command(f"cat << 'EOF' > /etc/cinemana_tunnel_wrapper.sh\n{wrapper_script}EOF\nchmod +x /etc/cinemana_tunnel_wrapper.sh\nkillall dbclient\n")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
