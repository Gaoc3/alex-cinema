import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import fasel_api

print("======================================================================")
print("🧪 DIAGNOSING DETAILS SCRAPER FOR THE SOPRANOS")
print("======================================================================\n")

# 1. Search for Sopranos
query = "Sopranos"
print(f"📡 Searching for query: '{query}'...")
results = fasel_api.search(query)
print(f"Found {len(results)} results:")
for idx, r in enumerate(results):
    print(f"  [{idx+1}] Title: '{r.get('title')}' | Type: {r.get('type')} | URL: {r.get('url')}")

if results:
    target_url = results[0]['url']
    print(f"\n📡 Fetching details for: '{results[0]['title']}'")
    print(f"URL: {target_url}\n")
    
    try:
        details = fasel_api.get_details(target_url)
        print("Details retrieved successfully!")
        print("Parsed fields:")
        print(f"  - Title:      '{details.get('title')}'")
        print(f"  - Description: '{details.get('description')[:100]}...'")
        print(f"  - Is Series:   {details.get('is_series')}")
        print(f"  - Seasons Count: {len(details.get('seasons', []))}")
        for i, s in enumerate(details.get('seasons', [])):
            print(f"    Season {i+1}: '{s.get('title')}' - {len(s.get('episodes', []))} episodes")
            if s.get('episodes'):
                print(f"      First Episode: '{s['episodes'][0].get('title')}' | URL: {s['episodes'][0].get('url')}")
    except Exception as e:
        print(f"❌ Failed to get details: {e}")
else:
    print("❌ No search results found for 'Sopranos'")
    
print("======================================================================")
