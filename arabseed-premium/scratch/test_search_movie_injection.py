import requests

url = "http://127.0.0.1:5000/api/search?q=the+punisher"
try:
    r = requests.get(url, timeout=30)
    data = r.json()
    results = data.get('results', [])
    
    with open("scratch/test_search_movie_injection_out.txt", "w", encoding="utf-8") as f:
        f.write(f"Status Code: {r.status_code}\n")
        f.write(f"Total Results: {len(results)}\n")
        for idx, r in enumerate(results):
            f.write(f"  {idx+1}: Title='{r.get('title')}', Type='{r.get('type')}', URL='{r.get('url')}'\n")
            
    print("Done! Results written to scratch/test_search_movie_injection_out.txt")
except Exception as e:
    print(f"Error: {e}")
