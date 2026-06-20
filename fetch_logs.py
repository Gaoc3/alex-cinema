import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)
    stdin, stdout, stderr = client.exec_command('dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "journalctl -u smart_proxy --no-pager -n 50"')
    out = stdout.read().decode('utf-8', 'ignore')
    print("LOGS:\n", out)
except Exception as e:
    print(e)
finally:
    client.close()
