import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:5000/api/search?q=the%20punisher&live=true"
print(f"📡 Requesting: {url}")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=5) as r:
        data = json.loads(r.read().decode('utf-8'))
        print("Response received successfully!")
        results = data.get('results', [])
        for i, item in enumerate(results):
            print(f"[{i+1}] Title: '{item.get('title')}'")
            print(f"    URL:    {item.get('url')}")
            print(f"    Poster: {item.get('poster')}")
            print(f"    Type:   {item.get('type')}")
except Exception as e:
    print(f"❌ Failed: {e}")
