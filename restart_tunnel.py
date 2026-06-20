import paramiko
import time

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    # Kill old dbclient and start_tunnel
    cmd = "killall dbclient; killall start_tunnel.sh; killall -9 dbclient; killall -9 start_tunnel.sh"
    c.exec_command(cmd)
    time.sleep(2)

    # Start the tunnel again in the background
    cmd2 = "/root/start_tunnel.sh > /dev/null 2>&1 &"
    c.exec_command(cmd2)
    time.sleep(3)

    # Check VPS ports again
    cmd3 = "dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'netstat -tulnp | grep 808'"
    stdin, stdout, stderr = c.exec_command(cmd3)

    out = stdout.read().decode('utf-8', errors='ignore')
    print("STDOUT:\n" + out)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
