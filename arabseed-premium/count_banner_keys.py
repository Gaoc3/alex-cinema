import json

with open("banner_sample.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Count how many times each key appears in the list of dictionaries
key_counts = {}
for item in data:
    for key in item.keys():
        key_counts[key] = key_counts.get(key, 0) + 1

print("Key presence counts (out of 42 items):")
print("-" * 50)
for key, count in sorted(key_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"{key:25s}: {count:2d}")
