import sys
import os
from bs4 import BeautifulSoup

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fasel_scraper import FaselAPI

api = FaselAPI()
print("--- Fetching /main with retries ---")
r = api.get_with_retry(f"{api.base_url}/main", timeout=15)
print("Status:", r.status_code)

if r.status_code == 200:
    soup = BeautifulSoup(r.text, 'html.parser')
    ep_child = soup.find(class_="epDivHome")
    if ep_child:
        print("\n=== Outer HTML of epDivHome ===")
        print(ep_child.prettify())
    else:
        print("epDivHome not found!")
else:
    print("Failed to fetch /main with status:", r.status_code)
