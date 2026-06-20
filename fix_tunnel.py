import paramiko
import time

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    # 1. Kill the hung sshd processes on the VPS that hold the tunnel ports
    cmd1 = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'kill -9 337945; pkill -f \"sshd: root@pts\"'"
    c.exec_command(cmd1)
    time.sleep(2)

    # 2. Kill the dbclient processes on the router
    cmd2 = "killall -9 dbclient; killall -9 start_tunnel.sh"
    c.exec_command(cmd2)
    time.sleep(2)

    # 3. Start the tunnel cleanly
    cmd3 = "/root/start_tunnel.sh > /dev/null 2>&1 &"
    c.exec_command(cmd3)
    time.sleep(4)

    # 4. Check if the ports bound successfully
    cmd4 = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'ss -tulnp | grep 808'"
    stdin, stdout, stderr = c.exec_command(cmd4)

    out = stdout.read().decode('utf-8', errors='ignore')
    print("STDOUT:\n" + out)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
