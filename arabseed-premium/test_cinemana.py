import requests, re
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.post('https://cinemana.cc/wp-content/themes/EEE/Inc/Ajax/Single/Server.php', data={'post_id': 3088352, 'server': 0}, headers=headers)
print("m3u8:", re.findall(r'(https?://[^\s\"\']+m3u8)', r.text))
print("source src:", re.findall(r'<source[^>]+src=["\']([^"\']+)["\']', r.text))
print("iframe src:", re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', r.text))
