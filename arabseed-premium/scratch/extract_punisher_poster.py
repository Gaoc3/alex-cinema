import sys
import os
from bs4 import BeautifulSoup

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import fasel_api

url = "https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"
print(f"📡 Fetching watch page HTML from: {url}")

try:
    r = fasel_api.get_with_retry(url)
    r.raise_for_status()
    html = r.text
    print("Successfully loaded HTML!")
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Search for posters inside standard faselhd elements
    # Often it's in a div with class "poster" or "posterImg" or similar, or as og:image meta tag!
    og_image = soup.find('meta', attrs={'property': 'og:image'})
    if og_image:
        print("Found og:image:", og_image.get('content'))
        
    twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
    if twitter_image:
        print("Found twitter:image:", twitter_image.get('content'))
        
    # Look for any image inside a poster container
    poster_div = soup.find(class_='poster')
    if poster_div:
        img = poster_div.find('img')
        if img:
            print("Found poster img src:", img.get('src') or img.get('data-src'))
            
    # Also look for any img tags on the page that might be the main poster
    all_imgs = soup.find_all('img')
    print(f"Found {len(all_imgs)} total images on the page:")
    for idx, img in enumerate(all_imgs):
        src = img.get('src') or img.get('data-src') or ''
        alt = img.get('alt') or ''
        if 'punisher' in src.lower() or 'punisher' in alt.lower() or 'poster' in src.lower() or 'uploads' in src.lower():
            print(f"  [{idx+1}] src: '{src}' | alt: '{alt}'")
                
except Exception as e:
    print(f"❌ Failed: {e}")
