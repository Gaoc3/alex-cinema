import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "http://127.0.0.1:5000/api/cache/clear"
try:
    r = requests.get(url, timeout=10)
    print("Response status:", r.status_code)
    print("Response JSON:", r.text)
except Exception as e:
    print("Error calling cache clear:", e)
