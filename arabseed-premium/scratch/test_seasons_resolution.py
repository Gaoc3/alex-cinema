# -*- coding: utf-8 -*-
import sys
import os
import time
import urllib.parse
from bs4 import BeautifulSoup
import concurrent.futures
from threading import Lock

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from fasel_scraper import FaselAPI, normalize_url

api = FaselAPI()
target_url = "https://web616x.faselhdx.bid/seasons/%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-sopranos"

print("📡 Step 1: Fetching main details page...")
r = api.get_with_retry(target_url)
if r.status_code != 200:
    print(f"❌ Failed to fetch details page: {r.status_code}")
    sys.exit(1)

soup = BeautifulSoup(r.text, 'html.parser')
season_loop = soup.find(class_="seasonLoop")
if not season_loop:
    print("❌ No seasonLoop found!")
    sys.exit(1)

season_divs = season_loop.find_all(class_="seasonDiv")
seasons_to_fetch = []

for s_div in season_divs:
    s_title = s_div.find(class_="title").get_text(strip=True) if s_div.find(class_="title") else "موسم غير معروف"
    onclick = s_div.get('onclick', '')
    import re
    m = re.search(r"href\s*=\s*['\"]([^'\"]+)['\"]", onclick)
    s_url = ""
    if m:
        s_url = m.group(1)
        if s_url.startswith('/'):
            s_url = api.base_url + s_url
            
    seasons_to_fetch.append({
        "title": s_title,
        "url": s_url
    })

print(f"\nFound {len(seasons_to_fetch)} seasons to resolve and fetch:")
for s in seasons_to_fetch:
    print(f"  - '{s['title']}' | Raw URL: {s['url']}")

# 2. Resolve redirects helper
def resolve_clean_url(s_data):
    raw_url = s_data['url']
    if '?p=' not in raw_url:
        return raw_url
        
    try:
        url_normalized = normalize_url(raw_url)
        headers = api.headers.copy()
        # Fetch with allow_redirects=False
        r_redir = api.session.get(url_normalized, headers=headers, allow_redirects=False, impersonate="chrome120")
        if r_redir.status_code in [301, 302] and 'Location' in r_redir.headers:
            clean_url = r_redir.headers['Location']
            print(f"✅ Resolved '{s_data['title']}' to clean: {clean_url}")
            return clean_url
    except Exception as e:
        print(f"⚠️ Error resolving redirect for {s_data['title']}: {e}")
    return raw_url

print("\n📡 Step 2: Resolving redirects in parallel...")
start_time = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    clean_urls = list(executor.map(resolve_clean_url, seasons_to_fetch))

for idx, c_url in enumerate(clean_urls):
    seasons_to_fetch[idx]['clean_url'] = c_url

print(f"Resolution done in {time.time() - start_time:.2f} seconds.")

# 3. Fetch season episodes helper
def fetch_season_episodes(s_data):
    url_to_fetch = s_data.get('clean_url') or s_data['url']
    print(f"📡 Fetching episodes for '{s_data['title']}' at: {url_to_fetch}...")
    eps = []
    try:
        # Use get_with_retry but directly on the clean URL!
        r_season = api.get_with_retry(url_to_fetch, timeout=10)
        if r_season.status_code == 200:
            s_soup = BeautifulSoup(r_season.text, 'html.parser')
            ep_all = s_soup.find(class_="epAll")
            if ep_all:
                ep_links = ep_all.find_all('a', href=True)
                for a in ep_links:
                    ep_href = a['href']
                    if ep_href.startswith('/'):
                        ep_href = api.base_url + ep_href
                    ep_title = a.get_text(strip=True)
                    eps.append({
                        "title": ep_title,
                        "url": ep_href
                    })
    except Exception as err:
        print(f"❌ Error fetching {s_data['title']}: {err}")
    
    s_data['episodes'] = eps
    print(f"✨ Scraped {len(eps)} episodes for '{s_data['title']}'")
    return s_data

print("\n📡 Step 3: Fetching season episodes in parallel...")
start_time = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    resolved_seasons = list(executor.map(fetch_season_episodes, seasons_to_fetch))

print(f"\nAll fetches done in {time.time() - start_time:.2f} seconds.")

print("\n=== FINAL RESULTS SUMMARY ===")
for s in resolved_seasons:
    print(f"- '{s['title']}': {len(s['episodes'])} episodes found.")
    if s['episodes']:
        print(f"  First: {s['episodes'][0]['title']} ({s['episodes'][0]['url']})")
