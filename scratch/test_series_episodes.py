import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Try searching for a series, e.g. "four seasons" or "هذا البحر"
search_url = "https://m.asd.ink/find/"
params = {"word": "four seasons"}

print("Searching for series...")
try:
    r = requests.get(search_url, params=params, headers=headers, timeout=10)
    soup = BeautifulSoup(r.text, "html.parser")
    blocks = soup.find_all(class_="movie__block")
    print(f"Found {len(blocks)} items in search.")
    
    # List search results
    for i, block in enumerate(blocks):
        href = block.get("href")
        title = block.find(class_="post__name").get_text(strip=True) if block.find(class_="post__name") else block.get_text(strip=True)
        print(f"{i+1}: {title} -> {href}")
        
    # Let's request the page of the first result
    if blocks:
        first_url = blocks[0].get("href")
        print(f"\nRequesting first result detail page: {first_url}")
        detail_r = requests.get(first_url, headers=headers, timeout=10)
        detail_soup = BeautifulSoup(detail_r.text, "html.parser")
        
        # Check for list of episodes
        print("\n--- Searching for episodes list in page ---")
        episodes_container = detail_soup.find(class_=lambda x: x and "episode" in x.lower()) or detail_soup.find(class_="episodes__list") or detail_soup.find(class_="episodes__grid")
        if episodes_container:
            print("Episodes container found by class!")
            for ep in episodes_container.find_all("a"):
                print("Episode Link:", ep.get("href"), "Text:", ep.get_text(strip=True))
        else:
            # Let's search for links containing "الحلقة" or "eps" in text or href
            print("No standard container found. Listing anchors with 'eps' or 'الحلقة':")
            for a in detail_soup.find_all("a"):
                href = a.get("href") or ""
                text = a.get_text(strip=True)
                if "eps" in href or "الحلقة" in text or "الحلقة" in href:
                    print("Found Episode Link:", href, "Text:", text)
                    
        # Let's check if there is an iframe or watch or download page
        print("\n--- Check watch/download for this item ---")
        for a in detail_soup.find_all("a"):
            href = a.get("href") or ""
            text = a.get_text(strip=True)
            if "تحميل" in text or "download" in href:
                print("Found Download link:", href)
            if "مشاهدة" in text or "watch" in href:
                print("Found Watch link:", href)
                
except Exception as e:
    print("Error:", e)
