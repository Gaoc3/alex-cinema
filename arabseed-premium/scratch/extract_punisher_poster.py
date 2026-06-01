import urllib.request
import re
import sys
from bs4 import BeautifulSoup

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

url = "https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"
print(f"📡 Fetching watch page HTML from: {url}")

try:
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode('utf-8')
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
