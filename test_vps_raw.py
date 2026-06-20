import paramiko
import base64

vps_script = """
import ssl
import socket

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE

with socket.create_connection(('127.0.0.1', 8082)) as sock:
    with context.wrap_socket(sock, server_hostname='cdn.shabakaty.com') as ssock:
        req = 'GET /vascin24-mp4/96427C70-1AC5-7B1E-3BA5-D66324ACC5F2_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782497537&Signature=EGC3qFqSZkjDX07yaRdQQglRnPs%3D HTTP/1.1\\r\\nHost: cdn.shabakaty.com\\r\\nConnection: close\\r\\nUser-Agent: curl/7.81.0\\r\\n\\r\\n'
        ssock.sendall(req.encode('utf-8'))
        resp = b''
        while True:
            data = ssock.recv(4096)
            if not data:
                break
            resp += data
        headers = resp.split(b'\\r\\n\\r\\n')[0]
        body = resp[len(headers)+4:]
        print(headers.decode('utf-8', errors='ignore'))
        print('Body length:', len(body))
        if len(body) < 1000:
            print(body.decode('utf-8', errors='ignore'))
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

b64_script = base64.b64encode(vps_script.encode('utf-8')).decode('utf-8')
cmd = f"dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 'echo {b64_script} | base64 -d > /tmp/test_cdn.py && python3 /tmp/test_cdn.py'"
stdin, stdout, stderr = c.exec_command(cmd)

print('STDOUT:\\n', stdout.read().decode('utf-8'))
print('STDERR:\\n', stderr.read().decode('utf-8'))
