import requests
import urllib.parse
import json
import sys

tunnel_base = "https://mtskycinemana.serveousercontent.com/cgi-bin/api?url="
headers = {
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 9; SM-G973F Build/PPR1.180610.011)"
}

url = "https://cinemana.shabakaty.com/api/android/banner/level/1"
full_url = f"{tunnel_base}{urllib.parse.quote(url)}"

try:
    r = requests.get(full_url, headers=headers, timeout=15)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Length of list: {len(data)}")
        with open("banner_sample.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Saved to banner_sample.json")
except Exception as e:
    print("Error:", e)
