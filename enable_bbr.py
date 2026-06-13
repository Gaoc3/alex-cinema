import paramiko

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_IP, username=VPS_USER, password=VPS_PASS)

c.exec_command('echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf')
c.exec_command('echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf')
c.exec_command('sysctl -p')

c.close()
print("BBR Enabled!")
