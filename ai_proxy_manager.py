import os
import time
import subprocess
import requests

# Ports and their corresponding CDNs
CDN_NODES = {
    8082: "cdn.shabakaty.com",
    8083: "cndw2.shabakaty.com",
    8084: "cnth2.shabakaty.com"
}
API_PORT = 8081

def check_port_active(port):
    """Check if the port is actively listening (meaning SSH tunnel is up)."""
    try:
        output = subprocess.check_output(f"ss -tulnp | grep ':{port}'", shell=True, text=True)
        return "sshd" in output
    except subprocess.CalledProcessError:
        return False

def check_cdn_health(port, host):
    """Test if the CDN tunnel can actually fetch data."""
    try:
        # We test by fetching a known tiny file or just getting the headers of the root
        # Using a timeout of 5 seconds
        res = requests.head(f"https://127.0.0.1:{port}/", headers={"Host": host}, verify=False, timeout=5)
        # Even a 404 or 403 means the server responded! Only timeouts/connection errors mean it's dead.
        return True
    except requests.RequestException:
        return False

def kill_zombie_sshd():
    """Kill all sshd processes to allow the router to cleanly reconnect."""
    print("[AI Proxy Manager] 🧟 Zombie connections detected! Purging sshd...")
    os.system("pkill -f 'sshd: root@pts'")
    os.system("pkill -f 'sshd: root@notty'")
    # We don't kill the main sshd service, just the user sessions
    time.sleep(2)

def rewrite_nginx_video_route(active_port, active_host):
    """Dynamically rewrite Nginx to route /video/ traffic to a working CDN node."""
    print(f"[AI Proxy Manager] 🔄 Adapting Nginx to use working CDN: {active_host} on port {active_port}")
    
    nginx_config = f"""
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cinemanacache:50m max_size=5g inactive=12h use_temp_path=off;

server {{
    listen 80 default_server;
    listen 443 ssl;
    server_name 64-225-99-144.nip.io _;
    
    ssl_certificate /etc/letsencrypt/live/64-225-99-144.nip.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/64-225-99-144.nip.io/privkey.pem;
    
    # Intercept 302 Redirects
    proxy_redirect ~^https?://([^.]+)\\.shabakaty\\.com/(.*)$ /$1/$2;
    
    # [AI ADAPTIVE ROUTE] - ALL CDNs map to the fallback working CDN: {active_host} on port {active_port}
    location ~ ^/(?:cdn|cndw2|cnth[0-9]+)/(.*) {{
        proxy_pass https://127.0.0.1:{active_port}/$1$is_args$args;
        proxy_set_header Host "{active_host}";
        proxy_ssl_server_name on;
        proxy_ssl_name "{active_host}";
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        proxy_buffering off;
    }}

    location ~ ^/cinemana/(.*) {{
        proxy_pass https://127.0.0.1:8081/$1$is_args$args;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        
        proxy_cache cinemanacache;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_buffering on;
    }}

    location / {{
        proxy_pass https://127.0.0.1:8081;
        proxy_set_header Host "cinemana.shabakaty.com";
        proxy_ssl_server_name on;
        proxy_ssl_name "cinemana.shabakaty.com";
        proxy_ssl_verify off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Referer "https://cinemana.shabakaty.com/";
        proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        proxy_buffering on;
    }}
}}
"""
    with open("/etc/nginx/sites-available/default", "w") as f:
        f.write(nginx_config)
    os.system("systemctl reload nginx")
    print("[AI Proxy Manager] ✅ Nginx reloaded with adaptive route.")

def ai_engine_loop():
    print("🚀 AI Proxy Manager initialized. Monitoring tunnels...")
    current_video_port = 8084
    
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    while True:
        try:
            api_alive = check_port_active(API_PORT) and check_cdn_health(API_PORT, "cinemana.shabakaty.com")
            
            if not api_alive:
                print("[AI Proxy Manager] ❌ API Tunnel (8081) is DEAD or HUNG!")
                kill_zombie_sshd()
                print("[AI Proxy Manager] Waiting 60s for router to automatically reconnect...")
                time.sleep(60)
                continue
                
            # Check the currently active video CDN
            current_cdn_host = CDN_NODES[current_video_port]
            cdn_alive = check_port_active(current_video_port) and check_cdn_health(current_video_port, current_cdn_host)
            
            if not cdn_alive:
                print(f"[AI Proxy Manager] ⚠️ Primary CDN ({current_cdn_host}) is failing! Searching for alternatives...")
                
                # Try finding another working CDN node
                fallback_found = False
                for port, host in CDN_NODES.items():
                    if port != current_video_port:
                        if check_port_active(port) and check_cdn_health(port, host):
                            print(f"[AI Proxy Manager] 🎯 Found working fallback CDN: {host}")
                            current_video_port = port
                            rewrite_nginx_video_route(port, host)
                            fallback_found = True
                            break
                
                if not fallback_found:
                    print("[AI Proxy Manager] ❌ ALL CDNs ARE DEAD! Purging zombie connections...")
                    kill_zombie_sshd()
                    time.sleep(60)
                    
        except Exception as e:
            print(f"[AI Proxy Manager] Core Error: {e}")
            
        # Check every 30 seconds
        time.sleep(30)

if __name__ == "__main__":
    ai_engine_loop()
