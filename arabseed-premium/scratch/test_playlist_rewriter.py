import urllib.parse
import requests

# Fetch the playlist
orig_url = "https://r467--1pqdyczv.c.scdns.io/stream/v1/hls/27lIjEZD4TbtWiCEapyNdw/1780158302/www.fasel-hd.cam/all/185.244.36.179/yes/T1/0/01-02/3/e83c86f622e20a89fa5cf262173f0489/160_hd1080b_playlist.m3u8"
stream_url = f"https://cinemana.cc/stream.php?session=3041179&url={urllib.parse.quote(orig_url)}"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://cinemana.cc/'
}

r = requests.get(stream_url, headers=headers, timeout=15)
lines = r.text.split('\n')

rewritten_lines = []
host = "localhost:5000"

for line in lines:
    line = line.strip()
    if not line:
        continue
    if line.startswith('#'):
        rewritten_lines.append(line)
    else:
        # Segment URL
        if line.startswith('stream.php'):
            abs_url = "https://cinemana.cc/" + line
        else:
            abs_url = line
        
        proxied_segment_url = f"http://{host}/api/stream?url={urllib.parse.quote(abs_url)}"
        rewritten_lines.append(proxied_segment_url)

print("--- Original first 3 segment lines ---")
orig_segments = [l for l in lines if not l.startswith('#') and l][:3]
for idx, s in enumerate(orig_segments):
    print(f"{idx+1}: {s}")

print("\n--- Rewritten first 3 segment lines ---")
rewritten_segments = [l for l in rewritten_lines if not l.startswith('#') and l][:3]
for idx, s in enumerate(rewritten_segments):
    print(f"{idx+1}: {s}")
