import requests, json
from Crypto.Cipher import AES
import base64
import hashlib

def decrypt_payload(encrypted_b64):
    key = hashlib.md5(b'AleXCinema_V1_SecKey_#2024!').hexdigest().encode()
    iv = b'1234567890123456'
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(base64.b64decode(encrypted_b64))
    unpadded = decrypted[:-decrypted[-1]]
    return json.loads(unpadded.decode('utf-8'))

res = requests.get('https://alex-cinema.vercel.app/api/proxy?endpoint=video/home/0').json()
data = decrypt_payload(res['payload'])
with open('debug_payload.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("Saved to debug_payload.json")
