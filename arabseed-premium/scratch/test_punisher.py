import sys
import os
import json

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fasel_scraper import FaselAPI

api = FaselAPI()
punisher_url = "https://web53112x.faselhdx.bid/seasons/%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-punisher"

print("--- Testing Details Scraping for The Punisher ---")
details = api.get_details(punisher_url)
print("Title:", details.get('title'))
print("Description:", details.get('description')[:120] + "...")
print("Is Series:", details.get('is_series'))
print("Seasons count:", len(details.get('seasons', [])))

if details.get('seasons'):
    first_season = details['seasons'][0]
    print(f"\nFirst Season: {first_season['title']}")
    print(f"Episodes count in season 1: {len(first_season.get('episodes', []))}")
    if first_season.get('episodes'):
        first_ep = first_season['episodes'][0]
        print(f"First Episode Title: {first_ep['title']}")
        print(f"First Episode URL: {first_ep['url']}")
        
        print("\n--- Testing Player Iframe Extraction ---")
        iframe_url = api.get_player_iframe_url(first_ep['url'])
        print("Player Iframe URL:", iframe_url)
        
        if iframe_url:
            print("\n--- Testing Deobfuscation Stream Resolution ---")
            from app import resolve_fasel_stream
            servers = resolve_fasel_stream(first_ep['url'])
            print("Resolved stream servers:")
            print(json.dumps(servers, indent=2, ensure_ascii=False))
