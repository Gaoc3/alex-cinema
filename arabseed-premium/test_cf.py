from curl_cffi import requests

def test():
    urls = ["https://www.fasel-hd.cam", "https://web6112x.faselhdx.bid", "https://faselhd.club"]
    impersonates = ["chrome110", "chrome116", "chrome120", "safari15_3"]
    
    for u in urls:
        for imp in impersonates:
            try:
                r = requests.get(u, impersonate=imp, timeout=5)
                print(f"{u} + {imp}: {r.status_code}")
            except Exception as e:
                print(f"{u} + {imp}: ERROR")

test()
