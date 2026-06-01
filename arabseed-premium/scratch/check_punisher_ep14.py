import requests
import re
from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests

base_url = "https://web616x.faselhdx.bid"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

url = f"{base_url}/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"
try:
    r = curl_requests.get(url, headers=headers, impersonate="chrome120", timeout=15)
    soup = BeautifulSoup(r.text, 'html.parser')
    
    with open("scratch/check_punisher_ep14_out.txt", "w", encoding="utf-8") as f:
        f.write(f"Status: {r.status_code}\n")
        # Find page title
        title_el = soup.find('h1') or soup.find('h2') or soup.title
        f.write(f"Title: {title_el.get_text(strip=True) if title_el else 'None'}\n")
        
        # Find singleDesc
        desc_div = soup.find(class_="singleDesc") or soup.find(class_="desc")
        f.write(f"Description: {desc_div.get_text(strip=True) if desc_div else 'None'}\n")
        
        # Check breadcrumbs or meta tags for category
        meta_tags = soup.find_all(class_=re.compile(r'meta|cat|tag|breadcrumb', re.I))
        for idx, m in enumerate(meta_tags):
            f.write(f"Meta tag {idx+1}: {m.get_text(strip=True)}\n")
            
    print("Done! Output written to scratch/check_punisher_ep14_out.txt")
except Exception as e:
    print(f"Error: {e}")
