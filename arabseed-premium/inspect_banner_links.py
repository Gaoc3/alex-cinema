import json

with open("banner_sample.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("Total banners:", len(data))
print("-" * 80)

no_nb = 0
video_links = 0
other_links = 0

for idx, item in enumerate(data):
    nb = item.get("nb")
    link = item.get("link", "")
    
    if not nb:
        no_nb += 1
    if "video" in link:
        video_links += 1
    else:
        other_links += 1
        print(f"Index {idx:2d} | nb={nb} | link='{link}' | title='{item.get('ar_title')}'")

print(f"\nStats: no_nb={no_nb}, video_links={video_links}, other_links={other_links}")
