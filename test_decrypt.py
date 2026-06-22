import requests
import json
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

def decrypt_payload(payload_b64):
    key = b'18261320293026211231313328221526'
    iv = b'1826132029302621'
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(base64.b64decode(payload_b64)), AES.block_size)
    return json.loads(decrypted.decode('utf-8'))

r = requests.get('https://alex-cinema.vercel.app/api/proxy?endpoint=video/1336019')
data = r.json()
payload = data.get('payload')
if payload:
    decrypted = decrypt_payload(payload)
    print("STREAMS:", json.dumps(decrypted.get('streams', []), indent=2))
else:
    print("No payload")
