import re

with open('static/js/main.14e3464c8b60094796b2.js', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.findall(r'[\"\']([a-zA-Z0-9_/\-]*mainCategories[a-zA-Z0-9_/\-\?]*)[\"\']', content)
print("mainCategories matches:", set(matches))

matches_api = re.findall(r'[\"\']([a-zA-Z0-9_/\-]*api/[a-zA-Z0-9_/\-\?]*)[\"\']', content)
print("\napi/ matches:")
for m in set(matches_api):
    if len(m) < 100:
        print(m)
