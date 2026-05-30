import sys
sys.stdout.reconfigure(encoding='utf-8')
from bs4 import BeautifulSoup

filepath = "c:\\Users\\secon\\.openclaw\\workspace\\student-grades-platform\\arabseed-clone\\raw_series.html"
with open(filepath, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
print("Total anchors count:", len(soup.find_all("a")))

# Find first 20 anchors and their classes
for i, a in enumerate(soup.find_all("a")[:20]):
    print(f"A {i+1}: href={a.get('href')} classes={a.get('class')} text={a.get_text(strip=True)[:50]}")
