import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

bash_script = """
set -e

echo "=== VPS Cleanup ==="
systemctl stop pyproxy || true
systemctl disable pyproxy || true
rm -f /etc/systemd/system/pyproxy.service
systemctl daemon-reload

systemctl stop nginx || true
systemctl disable nginx || true

# Kill old frps if any
docker rm -f frps || true
rm -rf /opt/frps

echo "=== DNS Hijack ==="
sed -i '/shabakaty.com/d' /etc/hosts
echo "127.0.0.1 cinemana.shabakaty.com cdn.shabakaty.com cndw1.shabakaty.com cndw2.shabakaty.com cndw3.shabakaty.com cndw4.shabakaty.com cndw5.shabakaty.com cnth1.shabakaty.com cnth2.shabakaty.com cnth3.shabakaty.com" >> /etc/hosts

echo "=== Setup FRP Server ==="
mkdir -p /opt/frps
cat << 'EOF' > /opt/frps/frps.toml
bindPort = 7000
auth.method = "token"
auth.token = "EarthlinkCinemanaSecureToken"
EOF

cat << 'EOF' > /opt/frps/docker-compose.yml
version: '3.3'
services:
  frps:
    image: snowdreamtech/frps:latest
    restart: always
    network_mode: "host"
    volumes:
      - ./frps.toml:/etc/frp/frps.toml
EOF

cd /opt/frps
docker-compose up -d

echo "VPS SETUP COMPLETE!"
"""

command = f'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 << \'EOF_SCRIPT\'\n{bash_script}\nEOF_SCRIPT'

stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode(errors='ignore'))
print("STDERR:\n", stderr.read().decode(errors='ignore'))
ssh.close()
