# -*- coding: utf-8 -*-
import sys
import os
import time

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from fasel_scraper import FaselAPI

api = FaselAPI()
raw_urls = [
    "https://web616x.faselhdx.bid/?p=7587",
    "https://web616x.faselhdx.bid/?p=7651",
    "https://web616x.faselhdx.bid/?p=7670",
    "https://web616x.faselhdx.bid/?p=7685",
    "https://web616x.faselhdx.bid/?p=7799",
    "https://web616x.faselhdx.bid/?p=17188"
]

print("📡 Resolving redirects sequentially with a 250ms sleep spacing...")
resolved = []
for idx, url in enumerate(raw_urls):
    time.sleep(0.25)
    clean = api.resolve_clean_url(url)
    resolved.append(clean)
    print(f"[{idx+1}] Raw: {url} --> Clean: {clean}")

print("\nSummary:")
for idx, clean in enumerate(resolved):
    print(f"Season {idx+1}: {'Resolved' if '?p=' not in clean else '❌ FAILED'} -> {clean}")
