import requests
import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# The main movie URL
movie_url = "https://m.asd.ink/%d9%81%d9%8a%d9%84%d9%85-%d8%a7%d9%84%d8%b3%d8%aa-2025/"
watch_url = movie_url + "watch/"

print("Fetching watch sub-page:", watch_url)
try:
    r = requests.get(watch_url, headers=headers, timeout=10)
    print("Status Code:", r.status_code)
    print("Response Length:", len(r.text))
    
    soup = BeautifulSoup(r.text, "html.parser")
    
    # Let's search for watch elements, iframes, players, servers
    print("\n--- Searching for watch elements ---")
    servers_list = soup.find(class_="servers__list")
    player_iframe = soup.find(class_="player__iframe")
    watch_area = soup.find(class_="watch__area")
    
    if servers_list:
        print("servers__list found!")
        for li in servers_list.find_all("li"):
            a_tag = li.find("a")
            btn = li.find("button")
            print("LI element:")
            if a_tag:
                print("  Link:", a_tag.get("href"), "Text:", a_tag.get_text(strip=True))
            if btn:
                print("  Button attrs:", btn.attrs, "Text:", btn.get_text(strip=True))
            print("-" * 10)
            
    if player_iframe:
        print("player__iframe found!")
        iframe = player_iframe.find("iframe")
        if iframe:
            print("  Iframe src:", iframe.get("src"))
            
    if watch_area:
        print("watch__area found!")
        # Print iframes inside it
        for iframe in watch_area.find_all("iframe"):
            print("  Iframe src:", iframe.get("src"))
            
    # Search for all iframes in the watch page
    print("\n--- All Iframes in Page ---")
    for i, iframe in enumerate(soup.find_all("iframe")):
        print(f"Iframe {i+1}:", iframe.attrs)
        
    # Search for potential stream source variables in scripts
    print("\n--- Streaming scripts variables ---")
    for script in soup.find_all("script"):
        src = script.get("src") or ""
        content = script.string or ""
        if "iframe" in content or "player" in content or "src" in content or "source" in content:
            # Print matching lines
            for line in content.splitlines():
                if any(k in line for k in ["player", "iframe", "src", "source", "video"]):
                    print("  Line:", line.strip())

    # Save the page html for safety
    with open("scratch/watch_page_raw.html", "w", encoding="utf-8") as f:
        f.write(r.text)
        
except Exception as e:
    print("Error:", e)
