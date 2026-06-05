import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("banner_sample.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total items: {len(data)}")
print("-" * 80)

# Let's count and inspect unique values for some fields like 'isSpecial', 'filmRating', etc.
is_special_counts = {}
for idx, item in enumerate(data):
    spec = item.get("isSpecial")
    is_special_counts[spec] = is_special_counts.get(spec, 0) + 1

print("isSpecial counts:", is_special_counts)

# Let's check if there are other keys that could indicate banner/hero items
# E.g., is there a 'type' or 'status' or does it check if kind is 1 vs 2, or if it has a certain image?
# Banners might have cover images or a special 'img' format.
# Let's check the suffix of 'img' for all items.
img_types = {}
for item in data:
    img = item.get("img", "")
    suffix = img.split("_")[-1] if "_" in img else "no_underscore"
    img_types[suffix] = img_types.get(suffix, 0) + 1
print("img name suffixes:", img_types)

# Let's print the items that are in the user's screenshot: "Minders of Him", "The Undertow", "Argo's ...", "Ronaldinho ...", "Scrubs", "The Madison", "Ling Cage", "Protector", "Stranger Things"
print("\n--- Inspecting items from the screenshot ---")
screenshot_titles = ["المفترس الأقوى", "المنقذ", "رونالدينيو", "Scrubs", "The Madison", "Ling Cage", "Protector", "Stranger Things", "Undertow", "Minders"]
for item in data:
    title = item.get("ar_title") or item.get("en_title") or ""
    matched = False
    for t in screenshot_titles:
        if t.lower() in title.lower():
            matched = True
            break
    if matched:
        print(f"nb={item.get('nb')} | Title='{title}' | isSpecial={item.get('isSpecial')} | img={item.get('img')} | kind={item.get('kind')} | keys={list(item.keys())[:10]}")
