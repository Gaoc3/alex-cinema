import http.server
import urllib.request
import socketserver
import threading
from socketserver import ThreadingMixIn

class ThreadingHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class ProxyHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()

    def handle_request(self):
        path_parts = self.path.strip('/').split('/', 1)
        if len(path_parts) >= 2 and (path_parts[0] == 'cdn' or path_parts[0] == 'cinemana' or path_parts[0].startswith('cndw') or path_parts[0].startswith('cnth')):
            subdomain = path_parts[0]
            rest_of_path = '/' + path_parts[1]
            target_url = f"http://{subdomain}.shabakaty.com{rest_of_path}"
        else:
            self.send_error(400, "Bad Request: Missing or invalid subdomain prefix")
            return

        print(f"Proxying to: {target_url}")
        req = urllib.request.Request(target_url)
        
        # Forward headers, but do NOT forward the Host header (urllib will set it correctly to the target)
        for key, value in self.headers.items():
            if key.lower() not in ['host', 'connection', 'accept-encoding']:
                req.add_header(key, value)
        
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(key, value)
                self.end_headers()
                
                # Stream the content
                while True:
                    chunk = response.read(8192)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
        except Exception as e:
            print(f"Error proxying {target_url}: {e}")
            self.send_error(500, str(e))

if __name__ == '__main__':
    server_address = ('127.0.0.1', 8080)
    httpd = ThreadingHTTPServer(server_address, ProxyHTTPRequestHandler)
    print("Router Proxy listening on 127.0.0.1:8080...")
    httpd.serve_forever()
