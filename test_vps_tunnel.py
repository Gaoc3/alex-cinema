import urllib.request
import urllib.parse
from urllib.error import HTTPError

# Construct the tunnel URL on the VPS
url = "http://64.225.99.144/cdn/vascin24-mp4/96427C70-1AC5-7B1E-3BA5-D66324ACC5F2_video.mp4"
params = {
    "response-content-disposition": "attachment; filename=\"video.mp4\"",
    "AWSAccessKeyId": "PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH",
    "Expires": "1782497537",
    "Signature": "EGC3qFqSZkjDX07yaRdQQglRnPs="
}

query_string = urllib.parse.urlencode(params)
full_url = f"{url}?{query_string}"

req = urllib.request.Request(full_url, method="HEAD")
# Simulate browser headers
req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
req.add_header("Referer", "https://alex-cinema.vercel.app/")

try:
    print(f"Fetching: {full_url}")
    response = urllib.request.urlopen(req)
    print(f"Status: {response.status}")
    print("Headers:")
    for k, v in response.headers.items():
        print(f"  {k}: {v}")
except HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print("Headers:")
    for k, v in e.headers.items():
        print(f"  {k}: {v}")
except Exception as e:
    print(f"Error: {e}")
