import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

commands = [
    "systemctl start frps",
    "systemctl status frps --no-pager"
]

for cmd in commands:
    print(f"Running: {cmd}")
    # Escape single quotes
    escaped_cmd = cmd.replace("'", "'\\''")
    remote_cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 '{escaped_cmd}'"
    
    stdin, stdout, stderr = ssh.exec_command(remote_cmd)
    
    # Wait for command to complete
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    
    if out:
        print(f"STDOUT: {out}")
    if err:
        print(f"STDERR: {err}")
    if exit_status != 0:
        print(f"WARNING: Command exited with {exit_status}")

print("FRP SERVICE CHECK COMPLETE!")
ssh.close()
