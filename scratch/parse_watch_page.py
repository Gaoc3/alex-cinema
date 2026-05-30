import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

filepath = "scratch/watch_page_raw.html"
with open(filepath, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

print("--- Check class='servers__list' ---")
servers_list = soup.find(class_="servers__list")
if servers_list:
    print("Found servers__list!")
    for i, li in enumerate(servers_list.find_all("li")):
        print(f"LI {i+1}:")
        print("  text:", li.get_text(strip=True))
        print("  attrs:", li.attrs)
        a = li.find("a")
        if a:
            print("  A tag attrs:", a.attrs)
            print("  A tag text:", a.get_text(strip=True))
        print("-" * 15)
else:
    print("Class 'servers__list' not found.")

print("\n--- Check all buttons and list items with data- attributes ---")
for tag in soup.find_all(["li", "button", "a"]):
    attrs = tag.attrs
    if any(k.startswith("data-") for k in attrs):
        print(f"Tag: {tag.name} | Text: {tag.get_text(strip=True)} | Attrs: {attrs}")
        
print("\n--- Check all iframes ---")
for iframe in soup.find_all("iframe"):
    print("Iframe:", iframe.attrs)

print("\n--- Check for any javascript objects containing servers ---")
import re
scripts = soup.find_all("script")
for i, script in enumerate(scripts):
    content = script.string or ""
    if "servers" in content.lower() or "watch" in content.lower():
        print(f"Script {i+1} might contain watch data, showing first 5 lines:")
        lines = content.strip().splitlines()
        for line in lines[:10]:
            print("  ", line.strip())
        print("...")
