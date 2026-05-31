# -*- coding: utf-8 -*-
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')

# Configure paths
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
sys.path.insert(0, os.path.abspath('.'))

from cinemana_scraper import CinemanaAPI

api = CinemanaAPI()

# Search for broad variations
queries = ["سبايدرمان", "سبايدر مان", "Spider-Man", "Spider Man"]
all_results = []
seen_urls = set()

for q in queries:
    results = api.search(q)
    for r in results:
        if r['url'] not in seen_urls:
            title = r.get('title', '')
            if "نوار" in title or "noir" in title.lower():
                seen_urls.add(r['url'])
                all_results.append(r)

print(f"Total results found containing 'نوار' or 'Noir': {len(all_results)}")
for idx, r in enumerate(all_results):
    print(f"[{idx}] Title: {r['title']} | Type: {r.get('type', '')} | URL: {r['url']}")
