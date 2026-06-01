import sys
from curl_cffi import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Construct URL
url = "https://web616x.faselhdx.bid/anime/page/1/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1"
}

session = requests.Session()
print("--- Fetching anime-series page 1 ---")
try:
    r = session.get(url, headers=headers, impersonate="chrome120", timeout=10)
    print("Status:", r.status_code)
    print("Text length:", len(r.text))
    if r.status_code != 200:
        print("Body snippet:", r.text[:500])
except Exception as e:
    print("Failed:", e)
