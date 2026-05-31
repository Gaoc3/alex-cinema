import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

client = app.test_client()

print("--- Querying /api/home ---")
r = client.get('/api/home')
print("Status Code:", r.status_code)
if r.status_code == 200:
    data = r.json
    print("Categories count:", len(data.get('categories', [])))
    for i, cat in enumerate(data.get('categories', [])):
        print(f"  Category {i+1}: {cat.get('category')} ({len(cat.get('cards', []))} cards)")
    print("Slides count:", len(data.get('slides', [])))
else:
    print("Error:", r.text)
