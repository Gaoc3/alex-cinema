import json, base64

try:
    with open(r'C:\Users\secon\Downloads\alex-cinema-log-export-2026-06-11T09-45-44.json', 'r', encoding='utf-8') as f:
        logs = json.load(f)
    
    domains = set()
    for l in logs:
        qs = l.get('requestQueryString', '')
        if 'endpoint=' in qs:
            ep = qs.split('endpoint=')[1].split('&')[0]
            try:
                # Add padding
                ep += '=' * ((4 - len(ep) % 4) % 4)
                dec = base64.urlsafe_b64decode(ep).decode('utf-8', 'ignore')
                if 'shabakaty.com' in dec:
                    domains.add(dec.split('/')[2])
            except Exception as e:
                pass
    
    print('Found domains in logs:', domains)
except Exception as e:
    print("Error:", e)
