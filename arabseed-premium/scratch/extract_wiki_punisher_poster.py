import urllib.request
import re
import sys
from bs4 import BeautifulSoup

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

url = "https://en.wikipedia.org/wiki/The_Punisher:_One_Last_Kill"
print(f"📡 Fetching Wikipedia page: {url}")

try:
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode('utf-8')
        print("Loaded HTML successfully!")
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Look for the infobox image
        infobox = soup.find('table', class_='infobox')
        if infobox:
            img = infobox.find('img')
            if img:
                print("Found infobox image src:", img.get('src'))
                # Wikimedia Commons image URLs look like: //upload.wikimedia.org/wikipedia/en/thumb/d/d4/The_Punisher_season_1_poster.jpg/220px-The_Punisher_season_1_poster.jpg
                src = img.get('src')
                if src.startswith('//'):
                    src = 'https:' + src
                print("Absolute URL:", src)
                
                # To get the high-resolution original image (instead of the thumb):
                # The thumb URLs are like: https://upload.wikimedia.org/wikipedia/en/thumb/A/AB/Filename.jpg/220px-Filename.jpg
                # We can convert it to the original: https://upload.wikimedia.org/wikipedia/en/A/AB/Filename.jpg
                if '/thumb/' in src:
                    parts = src.split('/')
                    # Remove '/thumb/' and the last element (220px-Filename.jpg)
                    original_parts = [p for p in parts if p != 'thumb']
                    original_url = '/'.join(original_parts[:-1])
                    print("Original high-res URL:", original_url)
                
        # Also let's print all og:image and twitter:image metas
        og_image = soup.find('meta', attrs={'property': 'og:image'})
        if og_image:
            print("Found og:image:", og_image.get('content'))
            
except Exception as e:
    print(f"❌ Failed: {e}")
