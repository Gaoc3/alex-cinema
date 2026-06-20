import ssl
import socket

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE

def test_request(host_header, path):
    print(f"--- Testing {host_header}{path} ---")
    with socket.create_connection(('127.0.0.1', 8082)) as sock:
        with context.wrap_socket(sock, server_hostname="cdn.shabakaty.com") as ssock:
            req = f"GET {path} HTTP/1.1\r\nHost: {host_header}\r\nConnection: close\r\nUser-Agent: curl/7.81.0\r\n\r\n"
            ssock.sendall(req.encode('utf-8'))
            resp = b""
            while True:
                data = ssock.recv(4096)
                if not data:
                    break
                resp += data
            headers_part = resp.split(b"\r\n\r\n")[0].decode('utf-8')
            print(headers_part)
            body = resp[len(headers_part)+4:]
            print(f"Body length: {len(body)}")
            if len(body) < 1000:
                print(body.decode('utf-8'))

test_request("cdn.shabakaty.com", "/vascin24-mp4/96427C70-1AC5-7B1E-3BA5-D66324ACC5F2_video.mp4?response-content-disposition=attachment%3B%20filename%3D%22video.mp4%22&AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782497537&Signature=EGC3qFqSZkjDX07yaRdQQglRnPs%3D")
