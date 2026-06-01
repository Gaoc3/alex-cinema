import requests
import json

target_url = "https://web616x.faselhdx.bid/seasons/%D9%85%D8%B3%D9%84%D8%B3%D9%84-the-punisher"
api_url = f"http://127.0.0.1:5000/api/details?url={target_url}"

try:
    r = requests.get(api_url, timeout=30)
    data = r.json()
    
    with open("scratch/test_details_filter_out.txt", "w", encoding="utf-8") as f:
        f.write(f"Status Code: {r.status_code}\n")
        f.write(f"Title: {data.get('title')}\n")
        f.write(f"Is Series: {data.get('is_series')}\n")
        seasons = data.get('seasons', [])
        f.write(f"Seasons Count: {len(seasons)}\n")
        
        for s in seasons:
            episodes = s.get('episodes', [])
            f.write(f"Season: '{s.get('title')}', Episodes Count: {len(episodes)}\n")
            for ep in episodes:
                f.write(f"  - Title: '{ep.get('title')}', URL: '{ep.get('url')}'\n")
    print("Done! Results written to scratch/test_details_filter_out.txt")
except Exception as e:
    print(f"Error: {e}")
