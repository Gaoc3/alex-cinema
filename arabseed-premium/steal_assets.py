import requests
import urllib.parse
from bs4 import BeautifulSoup
import os

target_url = 'https://cinemana.shabakaty.com/video/ar/1241966?showInfo=true'
router_tunnel = f'https://mtsky-free-server-docker.hf.space/cgi-bin/api?url={urllib.parse.quote(target_url)}'

print(f"Fetching {target_url} via tunnel...")
r = requests.get(router_tunnel, timeout=30)
html = r.text

with open('templates/cinemana_original.html', 'w', encoding='utf-8') as f:
    f.write(html)

soup = BeautifulSoup(html, 'html.parser')

print("Extracting CSS files...")
for link in soup.find_all('link', rel='stylesheet'):
    href = link.get('href')
    if href and href.endswith('.css'):
        if href.startswith('/'):
            href = 'https://cinemana.shabakaty.com' + href
        print(f"Fetching CSS: {href}")
        css_tunnel = f'https://mtsky-free-server-docker.hf.space/cgi-bin/api?url={urllib.parse.quote(href)}'
        try:
            css_r = requests.get(css_tunnel, timeout=10)
            filename = os.path.basename(urllib.parse.urlparse(href).path)
            with open(f'static/css/{filename}', 'w', encoding='utf-8') as f:
                f.write(css_r.text)
        except Exception as e:
            print(f"Failed CSS {href}: {e}")

print("Extracting JS files...")
for script in soup.find_all('script', src=True):
    src = script.get('src')
    if src and src.endswith('.js'):
        if src.startswith('/'):
            src = 'https://cinemana.shabakaty.com' + src
        print(f"Fetching JS: {src}")
        js_tunnel = f'https://mtsky-free-server-docker.hf.space/cgi-bin/api?url={urllib.parse.quote(src)}'
        try:
            js_r = requests.get(js_tunnel, timeout=20)
            filename = os.path.basename(urllib.parse.urlparse(src).path)
            with open(f'static/js/{filename}', 'w', encoding='utf-8') as f:
                f.write(js_r.text)
        except Exception as e:
            print(f"Failed JS {src}: {e}")

print("Done stealing frontend assets!")
