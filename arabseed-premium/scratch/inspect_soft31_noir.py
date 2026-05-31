# -*- coding: utf-8 -*-
import sys
import os
import requests
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

# Configure paths
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
sys.path.insert(0, os.path.abspath('.'))

from app import clean_for_search, parse_episode_title

url = "https://shabakaty.cinemana.soft31.com/watch=3021048/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')

title_el = soup.find('h1') or soup.find('h2') or soup.title
title = title_el.get_text(strip=True) if title_el else "Unknown"
print(f"Scraped Page Title: {title}")

# Let's see what seasons and episodes are on the page!
season_triggers = soup.find_all(class_='season-trigger')
season_wrappers = soup.find_all(class_='season-wrapper')
print(f"Found {len(season_triggers)} season triggers.")

for idx, (trigger, wrapper) in enumerate(zip(season_triggers, season_wrappers)):
    s_title = trigger.get_text(strip=True)
    print(f"\n[Season {idx}] Title: {s_title}")
    
    ep_anchors = wrapper.find_all('a', href=True)
    print(f"    Total episodes: {len(ep_anchors)}")
    for ep_idx, a in enumerate(ep_anchors[:10]):
        ep_text = a.get_text(strip=True)
        print(f"      - Ep: {ep_text} | Link: {a['href']}")
