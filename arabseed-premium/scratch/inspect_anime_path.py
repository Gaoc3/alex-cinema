import sys
from curl_cffi import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

base_url = "https://web616x.faselhdx.bid"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Test different potential paths
paths = ["anime", "anime-series", "anime-episodes"]
for p in paths:
    url = f"{base_url}/{p}/"
    try:
        r = requests.get(url, headers=headers, impersonate="chrome120", timeout=8)
        print(f"Path: /{p}/ -> Status Code: {r.status_code}, Length: {len(r.text)}")
    except Exception as e:
        print(f"Path: /{p}/ -> Failed: {e}")
