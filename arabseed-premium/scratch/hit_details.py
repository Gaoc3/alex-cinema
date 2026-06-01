import requests

url = "http://127.0.0.1:5000/api/details?url=https://web616x.faselhdx.bid/seasons/%D9%85%D8%B3%D9%84%D8%B3%D9%84-the-punisher"
try:
    r = requests.get(url, timeout=30)
    data = r.json()
    seasons = data.get('seasons', [])
    print(f"Status: {r.status_code}")
    print(f"Title: {data.get('title')}")
    print(f"Seasons count: {len(seasons)}")
    if len(seasons) > 1:
        print(f"Season 2 episodes count: {len(seasons[1].get('episodes', []))}")
    else:
        print("ERROR: Seasons count is less than 2!")
except Exception as e:
    print(f"Error: {e}")
