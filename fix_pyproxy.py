import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

new_pyproxy = r'''
import asyncio
from aiohttp import web, ClientSession, ClientTimeout, TCPConnector
import ssl

# Mapping of subdomains to local SSH tunnel ports
TUNNELS = {
    "cdn": 8082,
    "cndw2": 8083,
    "cnth2": 8084,
    "cinemana": 8081
}

# Pass-through headers from client
FORWARD_HEADERS = {"range", "if-range", "if-modified-since", "if-none-match", "accept", "accept-encoding"}

async def handle_request(request):
    subdomain = request.match_info.get("subdomain")
    path = request.match_info.get("path", "")

    if subdomain not in TUNNELS:
        return web.Response(status=404, text="Subdomain not found")

    port = TUNNELS[subdomain]

    # Construct the target URL with query string preserved
    target_url = f"https://127.0.0.1:{port}/{path}"
    if request.query_string:
        target_url += f"?{request.query_string}"

    # Build headers - forward client headers + inject Host/Referer
    headers = {
        "Host": f"{subdomain}.shabakaty.com",
        "Referer": "https://cinemana.shabakaty.com/",
        "User-Agent": request.headers.get(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
    }

    # Forward range and other useful headers
    for h in FORWARD_HEADERS:
        val = request.headers.get(h)
        if val:
            headers[h] = val

    # Disable SSL verification (tunnel uses shabakaty cert, not valid for 127.0.0.1)
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connector = TCPConnector(ssl=ssl_ctx)
    timeout = ClientTimeout(total=120)

    try:
        async with ClientSession(connector=connector, timeout=timeout) as session:
            async with session.request(
                request.method,
                target_url,
                headers=headers,
                allow_redirects=True,
                read_bufsize=65536
            ) as resp:

                # Build response headers - pass through important ones
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
        return web.Response(status=502, text=f"Bad Gateway: {e}")


async def handle_options(request):
    return web.Response(
        status=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type",
            "Access-Control-Max-Age": "86400",
        }
    )

app = web.Application()
app.router.add_route("OPTIONS", "/{subdomain}/{path:.*}", handle_options)
app.router.add_route("GET", "/{subdomain}/{path:.*}", handle_request)
app.router.add_route("HEAD", "/{subdomain}/{path:.*}", handle_request)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=8085)
'''

command = f'''dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "cat > /opt/pyproxy.py << 'HEREDOC'\n{new_pyproxy}\nHEREDOC\necho DONE"'''
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:", stdout.read().decode(errors='replace'))
print("STDERR:", stderr.read().decode(errors='replace'))
ssh.close()
