import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

filepath = "c:\\Users\\secon\\.openclaw\\workspace\\student-grades-platform\\arabseed-clone\\raw_series.html"
with open(filepath, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
print("Anchors with 'مسلسل' or 'episode' in href or text:")
count = 0
for a in soup.find_all("a"):
    href = a.get("href") or ""
    text = a.get_text(strip=True)
    if "مسلسل" in text or "مسلسل" in href or "episode" in href or "episode" in text:
        # Check parents' classes
        parent_classes = []
        p = a.parent
        while p and p.name != 'body':
            if p.get('class'):
                parent_classes.append(f"{p.name}.{'.'.join(p.get('class'))}")
            p = p.parent
        print(f"Href: {href}\n  Text: {text}\n  Classes: {a.get('class')}\n  Parents: {parent_classes[:3]}")
        print("-" * 20)
        count += 1
        if count >= 10:
            break
