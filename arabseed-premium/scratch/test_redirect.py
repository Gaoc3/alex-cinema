# -*- coding: utf-8 -*-
import sys
import os
from curl_cffi import requests

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from fasel_scraper import FaselAPI

api = FaselAPI()
url = "https://web616x.faselhdx.bid/?p=7587"

print("📡 Fetching with allow_redirects=False...")
headers = api.headers.copy()
r = api.session.get(url, headers=headers, allow_redirects=False, impersonate="chrome120")
print("Status Code:", r.status_code)
print("Headers:")
for k, v in r.headers.items():
    print(f"  {k}: {v}")

if r.status_code in [301, 302] and 'Location' in r.headers:
    redirect_url = r.headers['Location']
    print(f"\n✅ Found redirect URL: {redirect_url}")
    
    print("\n📡 Requesting clean redirect URL...")
    r_clean = api.session.get(redirect_url, headers=headers, impersonate="chrome120")
    print("Clean URL Status Code:", r_clean.status_code)
    print("Content snippet:", r_clean.text[:500])
else:
    print("\n❌ No redirect found or request blocked with status:", r.status_code)
    print("Body snippet:", r.text[:800])
