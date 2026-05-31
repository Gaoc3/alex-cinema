import sys
import os
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fasel_scraper import FaselAPI

api = FaselAPI()
query = "The Punisher"
print(f"--- Searching FaselHD for: '{query}' ---")
results = api.search(query)
print("Search results count:", len(results))
print("Results detail:")
print(json.dumps(results[:5], indent=2, ensure_ascii=False))
