import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

new_pyproxy = '''import asyncio
from aiohttp import web, ClientSession, ClientTimeout, TCPConnector
import ssl

TUNNELS = {
    "cdn": 8082,
    "cndw2": 8083,
    "cnth2": 8084,
    "cinemana": 8081
}

FORWARD_HEADERS = {"range", "if-range", "if-modified-since", "if-none-match", "accept"}

async def handle_request(request):
    subdomain = request.match_info.get("subdomain")
    path = request.match_info.get("path", "")

    if subdomain not in TUNNELS:
        return web.Response(status=404, text="Subdomain not found")

    port = TUNNELS[subdomain]
    target_url = "https://127.0.0.1:" + str(port) + "/" + path
    if request.query_string:
        target_url += "?" + request.query_string

    headers = {
        "Host": subdomain + ".shabakaty.com",
        "Referer": "https://cinemana.shabakaty.com/",
        "User-Agent": request.headers.get("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"),
    }

    for h in FORWARD_HEADERS:
        val = request.headers.get(h)
        if val:
            headers[h] = val

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connector = TCPConnector(ssl=ssl_ctx)
    timeout = ClientTimeout(total=120)

    try:
        async with ClientSession(connector=connector, timeout=timeout) as session:
            async with session.request(
                request.method, target_url, headers=headers,
                allow_redirects=True, read_bufsize=65536
            ) as resp:
                resp_headers = {}
                for k, v in resp.headers.items():
                    kl = k.lower()
                    if kl in ("content-type", "content-length", "content-range",
                              "accept-ranges", "etag", "last-modified", "content-disposition",
                              "cache-control", "age"):
                        resp_headers[k] = v
                resp_headers["Access-Control-Allow-Origin"] = "*"
                resp_headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges"
                proxy_response = web.StreamResponse(status=resp.status, headers=resp_headers)
                await proxy_response.prepare(request)
                async for chunk in resp.content.iter_chunked(65536):
                    await proxy_response.write(chunk)
                await proxy_response.write_eof()
                return proxy_response
    except asyncio.TimeoutError:
        return web.Response(status=504, text="Gateway Timeout")
    except Exception as e:
        return web.Response(status=502, text="Bad Gateway: " + str(e))

async def handle_options(request):
    return web.Response(status=204, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Max-Age": "86400",
    })

app = web.Application()
app.router.add_route("OPTIONS", "/{subdomain}/{path:.*}", handle_options)
app.router.add_route("GET", "/{subdomain}/{path:.*}", handle_request)
app.router.add_route("HEAD", "/{subdomain}/{path:.*}", handle_request)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=8085)
'''

# Encode the file content as base64 to safely transfer it via SSH command
encoded = base64.b64encode(new_pyproxy.encode('utf-8')).decode('ascii')

# Write pyproxy via a Python one-liner that decodes base64
write_cmd = ("python3 -c "
             "'import base64; "
             "f=open(\"/opt/pyproxy.py\",\"w\"); "
             "f.write(base64.b64decode(\"" + encoded + "\").decode()); "
             "f.close()'")

full_cmd = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "' + write_cmd + '"'
stdin, stdout, stderr = ssh.exec_command(full_cmd)
print("Write:", stdout.read().decode(errors='replace'))
print("Write err:", stderr.read().decode(errors='replace'))

# Restart pyproxy
restart_cmd = 'dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "systemctl restart pyproxy && sleep 2 && systemctl is-active pyproxy"'
stdin2, stdout2, stderr2 = ssh.exec_command(restart_cmd)
print("Restart:", stdout2.read().decode(errors='replace'))
print("Restart err:", stderr2.read().decode(errors='replace'))

ssh.close()
