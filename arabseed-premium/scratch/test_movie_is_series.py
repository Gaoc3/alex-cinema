import requests

url = "http://127.0.0.1:5000/api/details?url=https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"
try:
    r = requests.get(url, timeout=30)
    data = r.json()
    print(f"Status: {r.status_code}")
    print(f"Title: {data.get('title')}")
    print(f"Is Series: {data.get('is_series')}")
    print(f"Seasons count: {len(data.get('seasons', []))}")
except Exception as e:
    print(f"Error: {e}")
