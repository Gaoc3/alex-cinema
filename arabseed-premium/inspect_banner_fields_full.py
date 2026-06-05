import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open("banner_sample.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Let's inspect the keys and values of some items to see what distinguishes them
for idx, item in enumerate(data[:10]):
    print(f"\n--- Item {idx} (nb={item.get('nb')} title={item.get('ar_title')}) ---")
    for key, val in item.items():
        if val is not None and val != "" and val != [] and val != {}:
            print(f"  {key}: {str(val)[:200]}")
