import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=5)

cinemana_script = """#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

start_service() {
    procd_open_instance "cinemana_proxy"
    procd_set_param command lua /etc/config/proxy.lua
    procd_set_param respawn
    procd_close_instance

    procd_open_instance "cinemana_tunnel"
    procd_set_param command dbclient -y -y -c chacha20-poly1305@openssh.com -W 4194304 -K 30 -I 600 -o ExitOnForwardFailure=yes -i /etc/dropbear/id_rsa -N -R 8081:cinemana.shabakaty.com:443 -R 8082:cdn.shabakaty.com:443 -R 8083:cndw2.shabakaty.com:443 -R 8084:cnth2.shabakaty.com:443 root@64.225.99.144
    procd_set_param respawn
    procd_close_instance
}
"""

stdin, stdout, stderr = c.exec_command("cat << 'EOF' > /etc/init.d/cinemana\n" + cinemana_script + "EOF\nchmod +x /etc/init.d/cinemana\nkillall dbclient\n/etc/init.d/cinemana restart\n")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
