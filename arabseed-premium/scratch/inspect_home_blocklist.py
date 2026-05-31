import sys
from bs4 import BeautifulSoup
from curl_cffi import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

url = "https://web53112x.faselhdx.bid/main"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

r = requests.get(url, headers=headers, impersonate="chrome120", timeout=12)
print("Status Code:", r.status_code)
print("Text length:", len(r.text))
if r.status_code != 200:
    print("Headers:", r.headers)
    print("Preview of body:", r.text[:200])
soup = BeautifulSoup(r.text, 'html.parser')

print("=== Checking blockList div ===")
block_list = soup.find(id="blockList")
if block_list:
    print("Found blockList!")
    # Find the first epDivHome child
    ep_child = block_list.find(class_="epDivHome")
    if ep_child:
        print("\n=== Outer HTML of epDivHome ===")
        print(ep_child.prettify())
    else:
        print("epDivHome not found!")
else:
    print("blockList not found!")
