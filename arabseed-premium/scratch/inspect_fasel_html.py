import sys
import os
from bs4 import BeautifulSoup
from curl_cffi import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

url = "https://web53112x.faselhdx.bid/seasons/%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-punisher"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

r = requests.get(url, headers=headers, impersonate="chrome120", timeout=12)
soup = BeautifulSoup(r.text, 'html.parser')

print("=== Searching for Story/Description elements ===")
# Print elements that contain text
for tag in ['div', 'p', 'span', 'section']:
    elements = soup.find_all(tag, class_=True)
    for el in elements:
        cls_str = " ".join(el['class'])
        if any(x in cls_str.lower() for x in ['desc', 'story', 'excerpt', 'info', 'content', 'loading']):
            text = el.get_text(strip=True)
            if len(text) > 5:
                print(f"<{tag} class='{cls_str}'>: {text[:150]}")

print("\n=== Printing all meta/info section ===")
meta_div = soup.find(class_="singleDetails") or soup.find(class_="movie-meta") or soup.find(class_="postDetails")
if meta_div:
    print(meta_div.get_text(separator="\n", strip=True))
else:
    print("Meta div not found!")
