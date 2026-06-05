import re

with open('static/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find fetch URLs or paths
urls = set(re.findall(r'[\"\']((?:https?://|/api/)[a-zA-Z0-9_\-\./\?=&]+)[\"\']', content))
print("Found URLs:")
for u in sorted(urls):
    print(u)
