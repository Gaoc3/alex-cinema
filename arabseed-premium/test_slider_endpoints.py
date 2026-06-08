import requests
import urllib.parse
import json

tunnel_base = "https://mtsky-free-server-docker.hf.space/cgi-bin/api?url="
headers = {
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)"
}

def test_endpoint(endpoint):
    url = f"https://cinemana.shabakaty.com/api/android/{endpoint}"
    full_url = f"{tunnel_base}{urllib.parse.quote(url)}"
    try:
        r = requests.get(full_url, headers=headers, timeout=10)
        print(f"[{endpoint}] status={r.status_code}")
        if r.status_code == 200:
            try:
                data = r.json()
                if isinstance(data, list):
                    print(f"  -> List of {len(data)} items. First item keys: {list(data[0].keys()) if len(data) > 0 else 'empty'}")
                elif isinstance(data, dict):
                    print(f"  -> Dict with keys: {list(data.keys())}")
                else:
                    print(f"  -> Other json type: {type(data)}: {str(data)[:200]}")
            except Exception as e:
                print(f"  -> Text response (length {len(r.text)}): {r.text[:200]}")
    except Exception as e:
        print(f"[{endpoint}] error={e}")

endpoints = [
    "slider",
    "sliders",
    "promotions",
    "banners",
    "featured",
    "video", # We saw shabakaty_api.py fetches /api/android/video
    "home",
    "main",
    "latestMovies/level/2/itemsPerPage/5/page/1/",
]

for ep in endpoints:
    test_endpoint(ep)
