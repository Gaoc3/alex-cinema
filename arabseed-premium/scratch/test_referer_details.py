import sys
import os
import urllib.parse
from curl_cffi import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fasel_scraper import FaselAPI

api = FaselAPI()
ep_url = "https://web53112x.faselhdx.bid/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%a3%d9%88%d9%84-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-1"

print("--- Testing get_player_iframe_url with Referer in FaselAPI ---")
# 1. First test: call directly
try:
    print("Test 1: Direct call...")
    iframe_url = api.get_player_iframe_url(ep_url)
    print("Test 1 Result:", iframe_url)
except Exception as e:
    print("Test 1 failed:", e)

# 2. Second test: modify get_player_iframe_url inside the scraper to pass referer or ensure URL encoding
# Let's test get_with_retry directly with Referer set to the season page
season_url = "https://web53112x.faselhdx.bid/seasons/%d9%85%d8%b3%d9%84%d8%b3%d9%84-the-punisher"
try:
    print("\nTest 2: With Referer set to season page...")
    r = api.get_with_retry(ep_url, referer=season_url)
    print("Test 2 Status Code:", r.status_code)
except Exception as e:
    print("Test 2 failed:", e)

# 3. Third test: What if we quote the path manually or make sure it's fully quoted?
# Let's see if urllib.parse.quote is used on the path
parsed = urllib.parse.urlparse(ep_url)
# parsed.path is already quoted: '/episodes/%d9%85%d8%b3%d9%84%d8%b3%d9%84-punisher-%d8%a7%d9%84%d9%85%d9%88%d8%b3%d9%85-%d8%a7%d9%84%d8%a3%d9%88%d9%84-%d8%a7%d9%84%d8%ad%d9%84%d9%82%d9%87-1'
# If we do urllib.parse.unquote and then quote it again:
path_unquoted = urllib.parse.unquote(parsed.path)
path_requoted = urllib.parse.quote(path_unquoted)
re_url = f"{api.base_url}{path_requoted}"
print("\nRe-quoted URL:", re_url)
try:
    print("Test 3: Re-quoted path...")
    r = api.get_with_retry(re_url)
    print("Test 3 Status Code:", r.status_code)
except Exception as e:
    print("Test 3 failed:", e)
