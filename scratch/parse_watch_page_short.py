import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

filepath = "scratch/watch_page_raw.html"
with open(filepath, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

servers_list = soup.find(class_="servers__list")
if servers_list:
    print("Found servers__list!")
    for i, li in enumerate(servers_list.find_all("li")):
        print(f"LI {i+1}: text='{li.get_text(strip=True)}' | attrs={li.attrs}")
else:
    print("Class 'servers__list' not found.")

print("\nIframes:")
for iframe in soup.find_all("iframe"):
    print("Iframe:", iframe.attrs)

print("\nPotential script vars:")
import re
for script in soup.find_all("script"):
    content = script.string or ""
    if "object__info" in content or "psot_id" in content or "post_id" in content:
        print("Script contains post info:")
        for line in content.splitlines():
            if "psot_id" in line or "post_id" in line or "csrf_token" in line or "server" in line:
                print("  ", line.strip())
