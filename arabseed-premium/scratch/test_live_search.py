import sys
import os
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app, GLOBAL_KNOWN_CARDS, register_cards

client = app.test_client()

# Seed global index with some fake/sample popular cards so test doesn't depend on background worker timing
register_cards([
    {'title': 'مسلسل The Walking Dead الموسم 1', 'url': 'https://example.com/twd-s1', 'poster': 'twd.jpg', 'type': 'مسلسل'},
    {'title': 'مسلسل The Boys الموسم 4', 'url': 'https://example.com/boys-s4', 'poster': 'boys.jpg', 'type': 'مسلسل'},
    {'title': 'فيلم The Punisher: One Last Kill', 'url': 'https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill', 'poster': 'punisher.jpg', 'type': 'فيلم'}
])

print("======================================================================")
print("🧪 TESTING LIVE SEARCH PERFORMANCE AND ACCURACY")
print("======================================================================\n")

print("👉 1. Testing Live Search endpoint with live=true (instant memory lookup)")
t0 = time.time()
r = client.get('/api/search?q=Boys&live=true')
t1 = time.time()
elapsed_ms = (t1 - t0) * 1000

print(f"Status Code: {r.status_code}")
print(f"Response Time: {elapsed_ms:.2f} ms")
if r.status_code == 200:
    data = r.json
    print(f"Source: {data.get('source')}")
    print(f"Results Count: {data.get('count', 0)}")
    for item in data.get('results', []):
        print(f"  - Title: '{item.get('title')}' | Type: {item.get('type')}")
else:
    print("Error:", r.text)

print("\n👉 2. Testing Special Movie injection for 'بانيشر' with live=true")
t0 = time.time()
r = client.get('/api/search?q=بانيشر&live=true')
t1 = time.time()
elapsed_ms = (t1 - t0) * 1000

print(f"Status Code: {r.status_code}")
print(f"Response Time: {elapsed_ms:.2f} ms")
if r.status_code == 200:
    data = r.json
    print(f"Source: {data.get('source')}")
    print(f"Results Count: {data.get('count', 0)}")
    for item in data.get('results', []):
        print(f"  - Title: '{item.get('title')}' | Type: {item.get('type')}")
else:
    print("Error:", r.text)

print("\n👉 3. Testing prefix match ranking (e.g. searching 'The' to check order)")
r = client.get('/api/search?q=The&live=true')
if r.status_code == 200:
    results = r.json.get('results', [])
    print("Ranked Results order:")
    for idx, item in enumerate(results):
        print(f"  {idx+1}. {item.get('title')}")
else:
    print("Error:", r.text)

print("\n✅ Verification and performance check complete!")
print("======================================================================")
