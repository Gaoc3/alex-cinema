import re
import urllib.parse
import requests
from bs4 import BeautifulSoup

# Step 1: Scrape a live movie ID from the main page
base_url = "https://cinemana.cc"
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": base_url + "/"
})

print("Fetching main page to get a live watch URL...")
r = session.get(f"{base_url}/main/", timeout=10)
soup = BeautifulSoup(r.text, 'html.parser')
watch_a = None
for a in soup.find_all('a', href=True):
    if 'watch=' in a['href'] and re.search(r'watch=\d+', a['href']):
        watch_a = a
        break

if not watch_a:
    print("Could not find a live watch URL. Trying direct ID 3020938...")
    post_id = '3020938'
else:
    post_id = re.search(r'watch=(\d+)', watch_a['href']).group(1)
    print(f"Found live movie post ID: {post_id}")

watch_url = f"https://cinemana.cc/watch={post_id}/"
ajax_url = "https://cinemana.cc/wp-content/themes/EEE/Inc/Ajax/Single/Server.php"
data = {
    'post_id': post_id,
    'server': '0'
}

print(f"Resolving stream URL for post {post_id}...")
session.get(watch_url, timeout=10)
r = session.post(ajax_url, data=data, timeout=10)

stream_url = None
if r.status_code == 200:
    match = re.search(r'const\s+originalUrls\s*=\s*({[^}]+})', r.text)
    if match:
        urls_str = match.group(1)
        url_matches = re.findall(r'["\']?(\w+)["\']?\s*:\s*["\']([^"\']+)["\']', urls_str)
        if url_matches:
            # Get the first quality stream url
            orig_url = url_matches[0][1]
            stream_url = f"https://cinemana.cc/stream.php?session={post_id}&url={urllib.parse.quote(orig_url)}"
            print(f"Resolved direct HLS playlist URL: {stream_url}")

if not stream_url:
    print("Failed to resolve stream URL. Exiting.")
    exit(1)

# Step 2: Fetch HLS Playlist and inspect its CORS headers
print("\n--- Testing HLS Playlist CORS ---")
r_playlist = session.get(stream_url, timeout=10)
print(f"Playlist Status: {r_playlist.status_code}")
cors_origin = r_playlist.headers.get('Access-Control-Allow-Origin', 'NONE')
print(f"Playlist Access-Control-Allow-Origin: {cors_origin}")
for k, v in r_playlist.headers.items():
    if 'access-control' in k.lower():
        print(f"  {k}: {v}")

# Step 3: Parse a segment URL from the playlist
lines = r_playlist.text.split('\n')
segment_url = None
for line in lines:
    line = line.strip()
    if line and not line.startswith('#'):
        if line.startswith('stream.php'):
            segment_url = "https://cinemana.cc/" + line
        else:
            segment_url = line
        break

if not segment_url:
    print("Could not find any segment inside the playlist.")
    exit(1)

print(f"\nResolved segment URL: {segment_url}")

# Step 4: Request segment and inspect its CORS headers
print("\n--- Testing TS Segment CORS ---")
r_segment = session.get(segment_url, timeout=10)
print(f"Segment Status: {r_segment.status_code}")
segment_cors = r_segment.headers.get('Access-Control-Allow-Origin', 'NONE')
print(f"Segment Access-Control-Allow-Origin: {segment_cors}")
for k, v in r_segment.headers.items():
    if 'access-control' in k.lower():
        print(f"  {k}: {v}")
