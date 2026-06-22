import urllib.request
import json

try:
    req = urllib.request.Request(
        "http://127.0.0.1/cdn/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4",
        headers={"Host": "64-225-99-144.nip.io"}
    )
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Headers:", response.headers)
        data = response.read(100)
        print("Data:", data)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Headers:", e.headers)
    print("Body:", e.read().decode(errors='replace')[:200])
except Exception as e:
    print("Error:", e)
