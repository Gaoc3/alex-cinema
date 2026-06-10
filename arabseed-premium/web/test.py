import urllib.request
req = urllib.request.Request('https://mtskycinemana.loca.lt/cgi-bin/nph-proxy?url=https%3A%2F%2Fcinemana.shabakaty.com%2Fapi%2Fandroid%2FtranscoddedFiles%2Fid%2F3087422')
req.add_header('Bypass-Tunnel-Reminder', 'true')
try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except Exception as e:
    print(e.read().decode('utf-8'))
