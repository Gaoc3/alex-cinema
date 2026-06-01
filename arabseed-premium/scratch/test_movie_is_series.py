import requests

url = "http://127.0.0.1:5000/api/details?url=https://web616x.faselhdx.bid/episodes/%d8%ad%d9%84%d9%82%d8%a9-marvel-television-special-presentation-punisher-one-last-kill"
try:
    r = requests.get(url, timeout=30)
    data = r.json()
    
    with open("scratch/test_movie_is_series_out.txt", "w", encoding="utf-8") as f:
        f.write(f"Status: {r.status_code}\n")
        f.write(f"Title: {data.get('title')}\n")
        f.write(f"Is Series: {data.get('is_series')}\n")
        f.write(f"Seasons count: {len(data.get('seasons', []))}\n")
        
    print("Done! Results written to scratch/test_movie_is_series_out.txt")
except Exception as e:
    print(f"Error: {e}")
