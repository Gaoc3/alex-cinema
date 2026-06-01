import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

client = app.test_client()

print("--- Querying /api/anime ---")
r = client.get('/api/anime')
print("Status Code:", r.status_code)
if r.status_code == 200:
    data = r.json
    print("Anime count:", len(data.get('results', [])))
    for i, res in enumerate(data.get('results', [])):
        print(f"  Anime {i+1}: {res.get('title')} ({res.get('quality')}) - URL: {res.get('url')}")
else:
    print("Error:", r.text)
