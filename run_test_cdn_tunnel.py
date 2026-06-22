import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('64.225.99.144', username='root', key_filename='C:\\Users\\secon\\.ssh\\id_rsa')

script = """
import urllib.request
import json
import ssl

try:
    req = urllib.request.Request(
        "https://127.0.0.1:8082/vascin24-mp4/8AE930E6-5DA2-4D7F-0E55-FB55045F9582_video.mp4?AWSAccessKeyId=PSFBSAZRKNBJOAMKHHBIBOBEONKBBOPKEDDBFBOJCH&Expires=1782594164&Signature=GjcZ8dVp%2FcChQMkLr%2FGVpYdDOJk%3D",
        headers={
            "Host": "cdn.shabakaty.com",
            "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 11; Pixel 5 Build/RQ3A.210805.001.A1)",
            "Accept": "*/*"
        }
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    with urllib.request.urlopen(req, context=ctx) as response:
        print("Status:", response.status)
        print("Headers:", response.headers)
        data = response.read(100)
        print("Data:", data)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Headers:", e.headers)
    print("Body:", e.read().decode(errors='replace')[:500])
except Exception as e:
    print("Error:", e)
"""

command = f'python3 -c "{script}"'
stdin, stdout, stderr = ssh.exec_command(command)
print("STDOUT:\n", stdout.read().decode(errors='replace'))
print("STDERR:\n", stderr.read().decode(errors='replace'))
ssh.close()
