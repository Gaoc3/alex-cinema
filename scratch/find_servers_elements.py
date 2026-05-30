from bs4 import BeautifulSoup

filepath = "scratch/watch_page_raw.html"
with open(filepath, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

# Find all lists (ul/ol)
for tag in soup.find_all(["ul", "ol"]):
    classes = tag.get("class", [])
    if any(k in "".join(classes).lower() for k in ["server", "watch", "stream", "play"]):
        print(f"List Tag: {tag.name} | Classes: {classes}")
        for li in tag.find_all("li")[:5]:
            print(f"  LI text: '{li.get_text(strip=True)}' | attrs: {li.attrs}")
            a = li.find("a")
            if a:
                print(f"    a href: '{a.get('href')}' | class: {a.get('class')}")
            btn = li.find("button")
            if btn:
                print(f"    button attrs: {btn.attrs}")

# Find any iframes
print("\nIframes count:", len(soup.find_all("iframe")))
for iframe in soup.find_all("iframe"):
    print("  Iframe src:", iframe.get("src"))
    
# Let's search for "object__info" in scripts
print("\nChecking object__info:")
import re
for script in soup.find_all("script"):
    content = script.string or ""
    if "object__info" in content:
        # Extract the exact javascript block defining object__info or object_info
        matches = re.findall(r'(var\s+object__info\s*=\s*\{.*?\};)', content, re.DOTALL)
        for m in matches:
            print("  Matched block:", m)
        matches2 = re.findall(r'(object__info\s*=\s*\{.*?\};)', content, re.DOTALL)
        for m in matches2:
            print("  Matched block 2:", m)
