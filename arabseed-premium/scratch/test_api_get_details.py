# -*- coding: utf-8 -*-
import sys
import os
import json
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from fasel_scraper import FaselAPI

api = FaselAPI()
url = "https://web616x.faselhdx.bid/seasons/%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-sopranos"

print("📡 Fetching details via production FaselAPI.get_details()...")
start_time = time.time()
details = api.get_details(url)
end_time = time.time()

print(f"\nCompleted in {end_time - start_time:.2f} seconds.")
print("=== RESULTS ===")
print(f"Title:        '{details.get('title')}'")
print(f"Description:  '{details.get('description')[:150]}...'")
print(f"Is Series:    {details.get('is_series')}")
print(f"Seasons count: {len(details.get('seasons', []))}")

for s in details.get('seasons', []):
    print(f"  - '{s['title']}' | Clean URL: {s.get('clean_url')} | Episodes: {len(s.get('episodes', []))}")
    if s.get('episodes'):
        print(f"    First Ep: '{s['episodes'][0]['title']}' | URL: {s['episodes'][0]['url']}")
