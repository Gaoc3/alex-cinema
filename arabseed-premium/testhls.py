import requests

headers = {
    'sec-ch-ua-platform': '"Windows"',
    'Referer': 'https://cinemana.shabakaty.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    'Range': 'bytes=1627062272-',
    'sec-ch-ua-mobile': '?0',
}

params = {
    'response-content-disposition': 'attachment; filename="video.mp4"',
    'AWSAccessKeyId': 'PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH',
    'Expires': '1781591427',
    'Signature': 'bKDVA1nhpQnXUe+3eqQIrwkmnQk=',
}

response = requests.get(
    'https://cdn.shabakaty.com/vascin24-mp4/3E1CDBD1-2F88-CF78-B248-AFD574FBF2B6_video.mp4',
    params=params,
    headers=headers,
    allow_redirects=False=False,
)
print(response.status_code)