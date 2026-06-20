import paramiko

try:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

    cmd = "dbclient -R 8081:cinemana.shabakaty.com:443 -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 -N -f; sleep 2; dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'netstat -tulnp | grep 8081'"
    stdin, stdout, stderr = c.exec_command(cmd)

    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    print("STDOUT:\n" + out)
    print("STDERR:\n" + err)
except Exception as e:
    print(f"Failed to connect or execute: {e}")
