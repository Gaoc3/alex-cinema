import re
import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

def inspect_file(filepath):
    print(f"=== Inspecting {filepath} ===")
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Let's search for classes like episode, series, etc.
    episodes = soup.find_all(class_=re.compile("episode"))
    print(f"Found {len(episodes)} items with class matching 'episode'.")
    for i, ep in enumerate(episodes[:5]):
        print(f"Ep {i+1}:")
        print("  Tag:", ep.name)
        print("  Classes:", ep.get("class"))
        print("  Href:", ep.get("href"))
        title_el = ep.find(class_=re.compile("title")) or ep.find("h3") or ep.find(class_=re.compile("post__name"))
        if title_el:
            print("  Title:", title_el.get_text(strip=True))
            
    print("\nListing some raw blocks containing links:")
    blocks = soup.find_all(class_=re.compile("movie__block"))
    print(f"Found {len(blocks)} movie blocks in series page.")
    for i, block in enumerate(blocks[:5]):
        print(f"Block {i+1}:")
        print("  Href:", block.get("href"))
        title_el = block.find(class_=re.compile("post__name")) or block.find("h3")
        if title_el:
            print("  Title:", title_el.get_text(strip=True))
            
inspect_file("c:\\Users\\secon\\.openclaw\\workspace\\student-grades-platform\\arabseed-clone\\raw_series.html")
