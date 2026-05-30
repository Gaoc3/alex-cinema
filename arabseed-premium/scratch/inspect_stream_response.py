import sys
import re
import urllib.parse
import requests

sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://cinemana.cc/'
}
session.headers.update(headers)

# Test stream.php directly with Referer
orig_url = "https://r467--1pqdyczv.c.scdns.io/stream/v1/hls/27lIjEZD4TbtWiCEapyNdw/1780158302/www.fasel-hd.cam/all/185.244.36.179/yes/T1/0/01-02/3/e83c86f622e20a89fa5cf262173f0489/160_hd1080b_playlist.m3u8"
stream_url = f"https://cinemana.cc/stream.php?session=3041179&url={urllib.parse.quote(orig_url)}"

print(f"Fetching from stream.php at root: {stream_url}")
try:
    r = session.get(stream_url, timeout=15)
    print("Status Code:", r.status_code)
    print("Content Type:", r.headers.get('Content-Type'))
    print("\n--- M3U8 Playlist (First 20 lines) ---")
    lines = r.text.split('\n')
    for i, line in enumerate(lines[:20]):
        print(f"{i+1}: {line}")
except Exception as e:
    print("Error fetching stream:", e)
