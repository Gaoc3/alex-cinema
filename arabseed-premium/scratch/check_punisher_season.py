import requests
from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests
import sys

base_url = "https://web616x.faselhdx.bid"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

url = f"{base_url}/seasons/%D9%85%D8%B3%D9%84%D8%B3%D9%84-the-punisher"
try:
    r = curl_requests.get(url, headers=headers, impersonate="chrome120", timeout=15)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    with open("scratch/check_punisher_season_out.txt", "w", encoding="utf-8") as f:
        f.write(f"Status: {r.status_code}\n")
        
        # Check seasons list
        season_loop = soup.find(class_="seasonLoop")
        if season_loop:
            season_divs = season_loop.find_all(class_="seasonDiv")
            for s_div in season_divs:
                s_title = s_div.find(class_="title").get_text(strip=True) if s_div.find(class_="title") else "موسم غير معروف"
                onclick = s_div.get('onclick', '')
                f.write(f"Season title: {s_title}, onclick: {onclick}\n")
                
        # Check epAll
        ep_all = soup.find(class_="epAll")
        if ep_all:
            ep_links = ep_all.find_all('a', href=True)
            f.write(f"Found {len(ep_links)} links inside epAll:\n")
            for idx, a in enumerate(ep_links):
                f.write(f"  {idx+1}: text='{a.get_text(strip=True)}', href='{a['href']}'\n")
    print("Done! Output written to scratch/check_punisher_season_out.txt")
except Exception as e:
    print(f"Error: {e}")
