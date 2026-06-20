import asyncio
import logging
from aiohttp import web
import aiohttp
import ssl

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

PORTS = {
    8081: 'cinemana.shabakaty.com',
    8082: 'cdn.shabakaty.com',
    8083: 'cndw2.shabakaty.com',
    8084: 'cnth2.shabakaty.com',
}

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

def get_target_port(path: str) -> int:
    if path.startswith('/vascin-poster-images') or path.startswith('/vascin-cover-images') or path.startswith('/uploads/'):
        return 8084
    elif path.startswith('/vascin24-mp4') or path.startswith('/vascin24-video'):
        return 8083
    elif path.startswith('/vascin-translation-files'):
        return 8082
    else:
        return 8081

# Global session for keep-alive and connection pooling
global_session = None

async def init_session():
    global global_session
    connector = aiohttp.TCPConnector(ssl=ssl_ctx, limit=0, keepalive_timeout=30)
    global_session = aiohttp.ClientSession(connector=connector, auto_decompress=False)

async def handle_request(request: web.Request) -> web.StreamResponse:
    global global_session
    if global_session is None or global_session.closed:
        await init_session()
        
    path = request.path_qs
    target_port = get_target_port(request.path)
    target_domain = PORTS[target_port]
    
    upstream_headers = dict(request.headers)
    upstream_headers.pop('Host', None)
    upstream_headers['Host'] = target_domain
    upstream_headers['Referer'] = 'https://cinemana.shabakaty.com/'
    
    target_url = f"https://127.0.0.1:{target_port}{path}"
    
    try:
        req_kwargs = {
            'method': request.method,
            'url': target_url,
            'headers': upstream_headers,
            'allow_redirects': False,
            'timeout': aiohttp.ClientTimeout(total=15),
        }
        if request.method not in ('GET', 'HEAD'):
            req_kwargs['data'] = request.content

        # If it's a video on 8083 and it fails (e.g. 404), fallback to 8084
        resp = await global_session.request(**req_kwargs)
        
        if resp.status == 404 and target_port == 8083:
            resp.close()
            target_port = 8084
            target_domain = PORTS[target_port]
            upstream_headers['Host'] = target_domain
            target_url = f"https://127.0.0.1:{target_port}{path}"
            req_kwargs['url'] = target_url
            req_kwargs['headers'] = upstream_headers
            resp = await global_session.request(**req_kwargs)

        proxy_response = web.StreamResponse(status=resp.status, headers=resp.headers)
        await proxy_response.prepare(request)
        
        async for chunk in resp.content.iter_chunked(32768): # Increased chunk size for speed
            await proxy_response.write(chunk)
            
        return proxy_response
        
    except Exception as e:
        logger.error(f"Proxy error for {path}: {e}")
        return web.Response(status=502, text="Bad Gateway")

app = web.Application()
app.router.add_route('*', '/{tail:.*}', handle_request)

if __name__ == '__main__':
    logger.info("Starting Static Smart Proxy Engine on port 8000...")
    web.run_app(app, host='127.0.0.1', port=8000)
