import requests

url = "http://127.0.0.1:5000/api/anime"
try:
    r = requests.get(url, timeout=30)
    data = r.json()
    results = data.get('results', [])
    print(f"API Route: {url}")
    print(f"Status: {r.status_code}")
    print(f"Category: {data.get('category')}")
    print(f"Results Count: {len(results)}")
    if results:
        print("Sample Result:")
        print(f"  Title: {results[0].get('title')}")
        print(f"  URL: {results[0].get('url')}")
except Exception as e:
    print(f"Error calling {url}: {e}")
