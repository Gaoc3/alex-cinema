# -*- coding: utf-8 -*-
import sys
import os
from curl_cffi import requests
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from fasel_scraper import FaselAPI

api = FaselAPI()
url = "https://web616x.faselhdx.bid/seasons/%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-sopranos"

print("📡 Fetching HTML of details page...")
r = api.get_with_retry(url)
print("Status Code:", r.status_code)

if r.status_code == 200:
    soup = BeautifulSoup(r.text, 'html.parser')
    season_loop = soup.find(class_="seasonLoop")
    if season_loop:
        print("\n=== seasonLoop HTML ===")
        print(season_loop.prettify()[:2000])
    else:
        print("\n❌ seasonLoop not found! Let's look for any 'season' divs:")
        season_divs = soup.find_all(class_=lambda x: x and 'season' in x.lower())
        for idx, div in enumerate(season_divs[:5]):
            print(f"- Div {idx}: class={div.get('class')}")
            print(div.prettify()[:300])
            
    # Also print the story/description container to verify page parsed correctly
    desc_div = soup.find(class_="singleDesc")
    if desc_div:
        print("\nDescription:", desc_div.get_text(strip=True)[:150])
else:
    print("❌ Failed to fetch page:", r.text[:500])
