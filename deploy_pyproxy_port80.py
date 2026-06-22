import paramiko
import base64

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.1.1', username='root', password='punisher001')

proxy_script = """
import asyncio
from aiohttp import web, ClientSession

# Mapping of subdomains to local SSH tunnel ports
TUNNELS = {
    "cdn": 8082,
    "cndw2": 8083,
    "cnth2": 8084,
    "cinemana": 8081
}

async def handle_request(request):
    subdomain = request.match_info.get('subdomain')
    path = request.match_info.get('path')
    
    if subdomain not in TUNNELS:
        return web.Response(status=404, text="Subdomain not found")
        
    port = TUNNELS[subdomain]
    
    # Construct the target URL
    # We send to the SSH tunnel, bypassing DNS and SNI issues
    target_url = f"https://127.0.0.1:{port}/{path}"
    if request.query_string:
        target_url += f"?{request.query_string}"
        
    headers = {
        "Host": f"{subdomain}.shabakaty.com",
        "User-Agent": request.headers.get("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
        "Referer": "https://cinemana.shabakaty.com/"
    }

    async with ClientSession() as session:
        try:
            # ssl=False because 127.0.0.1 cert is for *.shabakaty.com
            async with session.request(request.method, target_url, headers=headers, ssl=False, allow_redirects=False) as resp:
                # Stream the response back
                proxy_response = web.StreamResponse(status=resp.status, headers={
                    k: v for k, v in resp.headers.items() if k.lower() not in ('transfer-encoding', 'content-encoding')
                })
                
                # Add CORS headers
                proxy_response.headers['Access-Control-Allow-Origin'] = '*'
                proxy_response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                
                await proxy_response.prepare(request)
                
                async for chunk in resp.content.iter_chunked(8192):
                    await proxy_response.write(chunk)
                    
                return proxy_response
        except Exception as e:
            return web.Response(status=500, text=str(e))

app = web.Application()
app.router.add_route('*', '/{subdomain}/{path:.*}', handle_request)

if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=80)
"""
encoded_script = base64.b64encode(proxy_script.encode()).decode()

# Install aiohttp, write script, setup systemd service
setup_cmds = f"""
dbclient -y -y -i /etc/dropbear/id_rsa root@64.225.99.144 "
echo '{encoded_script}' | base64 -d > /opt/pyproxy.py
systemctl restart pyproxy
sleep 2
systemctl status pyproxy
"
"""

stdin, stdout, stderr = ssh.exec_command(setup_cmds)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
