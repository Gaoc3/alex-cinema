import os
import re

dir_path = 'src'
for root, _, files in os.walk(dir_path):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # replace encodeURIComponent(X) inside /api/proxy?endpoint= with encodeProxyUrl(X)
            # but only if it's inside ` ` or ' '
            new_content = re.sub(r'encodeURIComponent\(((?:[^()]+|\([^()]*\))*)\)', r'encodeProxyUrl(\1)', content)
            
            if new_content != content:
                # Add import if missing
                if 'encodeProxyUrl' in new_content and 'encodeProxyUrl' not in content:
                    imports = "import { encodeProxyUrl } from '@/utils/proxyHelper';\n"
                    new_content = imports + new_content
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
