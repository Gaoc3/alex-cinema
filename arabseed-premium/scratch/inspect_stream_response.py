import sys
import re
import urllib.parse
import requests

sys.stdout.reconfigure(encoding='utf-8')

# Append path to scrape Cinemana
sys.path.append(r'c:\Users\secon\.openclaw\workspace\student-grades-platform\arabseed-premium')
from app import resolve_cinemana_stream

# Test watch URL
cinemana_url = "https://cinemana.cc/watch=3041179/"
print("Resolving stream for URL:", cinemana_url)
servers = resolve_cinemana_stream(cinemana_url)

if servers:
    first_server = servers[0]
    stream_url = first_server['original_url'] # FETCH THE ORIGINAL DIRECT STREAM URL
    print(f"\nFetching ORIGINAL stream content with Referer from: {stream_url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://cinemana.cc/' # ADD REFERER
    }
    try:
        r = requests.get(stream_url, headers=headers, timeout=15)
        print("Status Code:", r.status_code)
        print("Content Type:", r.headers.get('Content-Type'))
        print("\n--- M3U8 Playlist (First 30 lines) ---")
        lines = r.text.split('\n')
        for i, line in enumerate(lines[:30]):
            print(f"{i+1}: {line}")
    except Exception as e:
        print("Error fetching stream:", e)
else:
    print("No servers resolved.")
