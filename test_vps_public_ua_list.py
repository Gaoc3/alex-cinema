import urllib.request
import json
import time

url = f"http://64.225.99.144/cnth2/vascin-poster-images/1703666299_261.jpg?bypass={time.time()}"
user_agents = [
    "ExoPlayer/2.11.4",
    "Cinemana/1.0",
    "okhttp/3.12.1",
    "Dalvik/2.1.0 (Linux; U; Android 11; Pixel 5 Build/RQ3A.210805.001.A1)",
    "AppleCoreMedia/1.0.0.19G82 (iPhone; U; CPU OS 15_6_1 like Mac OS X; ar_iq)",
    "Shabakaty Cinemana/1.0.0"
]

for ua in user_agents:
    print(f"\n--- Testing UA: {ua} ---")
    try:
        req = urllib.request.Request(
            url,
            headers={
                "Host": "64-225-99-144.nip.io",
                "User-Agent": ua
            }
        )
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print("Content-Type:", response.headers.get("Content-Type"))
            print("Content-Length:", response.headers.get("Content-Length"))
            data = response.read(100)
            if b'html' in data.lower():
                print("Result: HTML Challenge Page")
            else:
                print("Result: SUCCESS (Not HTML)")
    except Exception as e:
        print("Error:", e)
