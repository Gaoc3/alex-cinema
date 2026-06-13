import paramiko

VPS_IP = "64.225.99.144"
VPS_USER = "root"
VPS_PASS = "Mtsky1STgg"

pubkey = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDH9SkNlxUHCsFlTBF8ddpCrOfzwcmuQ9oaYJIXrC949MBwI4MCrDo+jnmMu/UAfH+cvTWGekxYVGO3ky5v4amPraU0letMsv3wB+H61hrbMrNraNMTZqlgsfkps4H4UAtckqfZLbUSPRRGy7hadJaj1Fz/EfWv31fLe2NIupF1m57YbGcZl7RX+Pz1w/Aq3REsWiZZhGeMQ4tSfCfKbHoDYbn2S4dIeKf7zBlGnJUeVzRI47GMo/cnHlfzmB4sa0WBx45mxOLfShg2UQtvxOWHcNf58WqMGMEe72H3VgLQ2CtmwoBhgQueBUn+E/7y8BSDr9u4aHNwvcr9rUT7YMwr root@OpenWrt"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(VPS_IP, username=VPS_USER, password=VPS_PASS)

c.exec_command(f'echo "{pubkey}" >> /root/.ssh/authorized_keys')
c.exec_command('sed -i "s/GatewayPorts no/GatewayPorts yes/g" /etc/ssh/sshd_config')
c.exec_command('systemctl restart sshd')
c.close()
print("Done!")
