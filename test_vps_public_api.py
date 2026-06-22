import urllib.request
import json

try:
    req = urllib.request.Request(
        "http://64.225.99.144/cinemana/api/android/home",
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
    print("Body:", e.read().decode(errors='replace')[:500])
except Exception as e:
    print("Error:", e)
