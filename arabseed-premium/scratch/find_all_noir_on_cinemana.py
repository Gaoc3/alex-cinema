# -*- coding: utf-8 -*-
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')

# Configure paths
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
sys.path.insert(0, os.path.abspath('.'))

from cinemana_scraper import CinemanaAPI

api = CinemanaAPI()

queries = ["Spider Noir", "سبايدر نوار", "Spider-Man Noir", "سبايدرمان نوار"]
seen_urls = set()

print("🔍 HARVESTING ALL NOIR RESULTS...")
for q in queries:
    results = api.search(q)
    print(f"Query '{q}' returned {len(results)} results:")
    for r in results:
        url = r['url']
        if url not in seen_urls:
            seen_urls.add(url)
            print(f"  - Title: {r['title']} | Type: {r.get('type', '')} | URL: {url}")
