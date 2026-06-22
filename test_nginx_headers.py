import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

python_server = """
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind(('127.0.0.1', 8089))
s.listen(1)
conn, addr = s.accept()
data = conn.recv(4096)
with open('/tmp/nginx_headers.txt', 'wb') as f:
    f.write(data)
conn.sendall(b"HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nOK")
conn.close()
"""
encoded_server = base64.b64encode(python_server.encode()).decode()

nginx_test_conf = """
server {
    listen 8088;
    location /cnth2/ {
        proxy_pass http://127.0.0.1:8089/;
        proxy_set_header Host "cnth2.shabakaty.com";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
    }
}
"""
encoded_conf = base64.b64encode(nginx_test_conf.encode()).decode()

cmd_setup = f"""dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "python3 -c \\"import base64; open('/etc/nginx/sites-available/test', 'w').write(base64.b64decode('{encoded_conf}').decode())\\"; ln -sf /etc/nginx/sites-available/test /etc/nginx/sites-enabled/test; nginx -s reload; python3 -c \\"import base64; exec(base64.b64decode('{encoded_server}'))\\" & sleep 2; curl http://127.0.0.1:8088/cnth2/test.jpg; sleep 1; cat /tmp/nginx_headers.txt" """

stdin, stdout, stderr = ssh.exec_command(cmd_setup)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
