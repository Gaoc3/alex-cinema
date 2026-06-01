import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app, app_cache

app_cache.clear()
client = app.test_client()

print("--- Querying /api/movies (Fresh No Cache) ---")
r = client.get('/api/movies')
print("Status Code:", r.status_code)
if r.status_code == 200:
    data = r.json
    print("Movies count:", len(data.get('results', [])))
    for i, res in enumerate(data.get('results', [])):
        print(f"  Movie {i+1}: {res.get('title')} ({res.get('quality')}) - URL: {res.get('url')}")
else:
    print("Error:", r.text)
