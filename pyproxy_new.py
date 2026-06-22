import asyncio
from aiohttp import web, ClientSession, ClientTimeout, TCPConnector
from aiohttp.resolver import DefaultResolver
import ssl
import socket
import logging

logging.basicConfig(level=logging.DEBUG)

TUNNELS = {
    "cinemana": 8081,
    "cdn": 8082,
    "cndw2": 8083,
    "cnth2": 8084,
    "cndw1": 8085,
    "cndw3": 8086,
    "cndw4": 8087,
    "cndw5": 8088,
    "cnth1": 8089,
    "cnth3": 8090,
}

FORWARD_HEADERS = {"range", "if-range", "if-modified-since", "if-none-match", "accept"}

class LocalResolver(DefaultResolver):
    async def resolve(self, host, port=0, family=socket.AF_INET):
        print(f"Resolving: host={host}, port={port}")
        if host.endswith('.shabakaty.com'):
            subdomain = host.split('.')[0]
            target_port = TUNNELS.get(subdomain, 8081)
            print(f"Override: host={host} -> 127.0.0.1:{target_port}")
            return [{
                'hostname': host,
                'host': '127.0.0.1',
                'port': target_port,
                'family': socket.AF_INET,
                'proto': 0,
                'flags': 0
            }]
        return await super().resolve(host, port, family)

async def handle_request(request):
    subdomain = request.match_info.get("subdomain")
    path = request.match_info.get("path", "")

    if subdomain not in TUNNELS:
        return web.Response(status=404, text="Subdomain not found")

    target_url = f"https://{subdomain}.shabakaty.com/{path}"
    if request.query_string:
        target_url += "?" + request.query_string

    print(f"Target URL: {target_url}")

    headers = {
        "Host": f"{subdomain}.shabakaty.com",
        "Referer": "https://cinemana.shabakaty.com/",
        "User-Agent": request.headers.get("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"),
    }

    for h in FORWARD_HEADERS:
        val = request.headers.get(h)
        if val:
            headers[h] = val

    print(f"Headers: {headers}")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    
    connector = TCPConnector(ssl=ssl_ctx, resolver=LocalResolver())
    timeout = ClientTimeout(total=120)

    try:
        async with ClientSession(connector=connector, timeout=timeout) as session:
            print("Sending request...")
            async with session.request(
                request.method, target_url, headers=headers,
                allow_redirects=False, read_bufsize=65536
            ) as resp:
                print(f"Response status: {resp.status}")
                resp_headers = {}
                for k, v in resp.headers.items():
                    kl = k.lower()
                    if kl in ("content-type", "content-length", "content-range",
                              "accept-ranges", "etag", "last-modified", "content-disposition",
                              "cache-control", "age"):
                        resp_headers[k] = v
                    elif kl == "location":
                        loc = v
                        if "shabakaty.com" in loc:
                            try:
                                parts = loc.split("://")
                                if len(parts) == 2:
                                    domain_path = parts[1]
                                    domain = domain_path.split("/")[0]
                                    path_and_query = "/" + "/".join(domain_path.split("/")[1:])
                                    redirect_subdomain = domain.split(".")[0]
                                    loc = f"https://64-225-99-144.nip.io/{redirect_subdomain}{path_and_query}"
                            except Exception:
                                pass
                        resp_headers["Location"] = loc
                
                resp_headers["Access-Control-Allow-Origin"] = "*"
                resp_headers["Access-Control-Expose-Headers"] = "Content-Range, Content-Length, Accept-Ranges, Location"
                
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
