import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("banner_sample.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total banners returned: {len(data)}")
print("-" * 80)
for idx, item in enumerate(data[:35]):
    title = item.get("ar_title") or item.get("en_title")
    nb = item.get("nb")
    is_special = item.get("isSpecial")
    link = item.get("link")
    kind = item.get("kind")
    img = item.get("img")
    
    print(f"Index {idx:2d} | nb={nb} | Title='{title}' | isSpecial={is_special} | link={link} | kind={kind} | img={img}")
