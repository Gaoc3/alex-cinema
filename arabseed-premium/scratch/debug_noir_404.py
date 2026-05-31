# -*- coding: utf-8 -*-
import sys
import requests
sys.stdout.reconfigure(encoding='utf-8')

url = "https://cinemana.cc/watch=3021048/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://cinemana.cc/"
}

r = requests.get(url, headers=headers, allow_redirects=True)
print("Status Code:", r.status_code)
print("Final URL:", r.url)
print("Redirect History:", r.history)
print("Headers:", r.headers)
if r.status_code == 200:
    print("Body length:", len(r.text))
else:
    print("Body snippet:", r.text[:500])
