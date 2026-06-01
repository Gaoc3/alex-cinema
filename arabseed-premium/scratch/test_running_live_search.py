import urllib.request
import urllib.parse
import json
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("======================================================================")
print("🧪 TESTING ACTIVE RUNNING FLASK SERVER LIVE SEARCH LATENCY")
print("======================================================================\n")

base_url = "http://127.0.0.1:5000"

def query_search(query, live=True):
    params = {'q': query}
    if live:
        params['live'] = 'true'
    
    url = f"{base_url}/api/search?{urllib.parse.urlencode(params)}"
    print(f"📡 Querying: {url}")
    
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as r:
            status = r.status
            data = json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ HTTP Request failed: {e}")
        return None
        
    t1 = time.time()
    elapsed_ms = (t1 - t0) * 1000
    
    print(f"   Status Code: {status}")
    print(f"   Latency: {elapsed_ms:.2f} ms")
    if data:
        print(f"   Source: {data.get('source', 'unknown')}")
        print(f"   Results Count: {data.get('count', 0)}")
        results = data.get('results', [])
        for i, item in enumerate(results[:5]):
            print(f"     {i+1}. Title: '{item.get('title')}' | Type: {item.get('type')}")
        if len(results) > 5:
            print(f"     ... and {len(results)-5} more items")
    print()
    return data

# Wait a brief moment to make sure background worker finished warming
print("🕒 Querying 'The Boys' with live=true...")
query_search("The Boys", live=True)

print("🕒 Querying 'بانيشر' (The Punisher) with live=true...")
query_search("بانيشر", live=True)

print("🕒 Querying 'Walking Dead' with live=true...")
query_search("Walking Dead", live=True)

print("======================================================================")
