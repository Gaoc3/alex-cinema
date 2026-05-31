# -*- coding: utf-8 -*-
import sys
import requests
sys.stdout.reconfigure(encoding='utf-8')

url = "https://shabakaty.cinemana.soft31.com/watch=3021048/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

r = requests.get(url, headers=headers)
print("Status Code:", r.status_code)
print("Body length:", len(r.text))
if r.status_code == 200:
    print("Snippet:")
    print(r.text[:800])
