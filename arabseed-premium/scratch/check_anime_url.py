import requests
from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests

base_url = "https://web616x.faselhdx.bid"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

urls = [
    f"{base_url}/anime/",
    f"{base_url}/anime-episodes/",
    f"{base_url}/anime-series/",
    f"{base_url}/cat/anime/",
]

for url in urls:
    try:
        r = curl_requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        cards = soup.find_all(class_="postDiv")
        print(f"URL: {url} -> Status: {r.status_code}, Cards: {len(cards)}")
    except Exception as e:
        print(f"URL: {url} -> Error: {e}")
