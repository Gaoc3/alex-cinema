import time
from curl_cffi import requests as curl_requests
from bs4 import BeautifulSoup

base_url = "https://web616x.faselhdx.bid"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

urls = [
    f"{base_url}/anime/",
    f"{base_url}/anime/page/1/",
    f"{base_url}/anime/page/2/",
    f"{base_url}/anime/page/3/",
]

for url in urls:
    try:
        r = curl_requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        cards = soup.find_all(class_="postDiv")
        print(f"URL: {url} -> Status: {r.status_code}, Cards: {len(cards)}")
        time.sleep(1.5)  # Respect rate limit
    except Exception as e:
        print(f"URL: {url} -> Error: {e}")
