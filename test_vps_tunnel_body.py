import urllib.request
import urllib.parse
from urllib.error import HTTPError

url = "http://64.225.99.144/cdn/vascin24-mp4/96427C70-1AC5-7B1E-3BA5-D66324ACC5F2_video.mp4"
req = urllib.request.Request(url, method="GET")

try:
    response = urllib.request.urlopen(req)
    html = response.read().decode('utf-8')
    print(html[:500])
except Exception as e:
    print(f"Error: {e}")
