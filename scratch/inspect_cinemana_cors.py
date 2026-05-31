import urllib.parse
import requests

# Let's inspect the headers of the stream.php endpoint of cinemana
url = "https://cinemana.cc/stream.php"
params = {
    'session': '3020938',
    'url': 'https://r467--4tmgnygn.c.scdns.io/stream/v1/hls/laPIViPZQOpVdU6vyMcgsg/1780253716/www.fasel-hd.cam/all/185.244.36.179/yes/T1/0/04-02/3/2f1183e3be8d5be2c3df874024999c38/playlist.m3u8'
}
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://cinemana.cc/'
}

print("Fetching cinemana stream.php headers...")
r = requests.get(url, params=params, headers=headers, allow_redirects=False)
print(f"Status Code: {r.status_code}")
print("Response Headers:")
for k, v in r.headers.items():
    print(f"  {k}: {v}")
print("-" * 50)
if r.status_code == 200:
    print("Content preview:")
    print(r.text[:500])
