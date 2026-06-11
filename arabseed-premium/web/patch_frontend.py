import os
import re

dir_path = 'src'
imports = "import { decryptData } from '@/utils/cryptoHelper';\n"

for root, _, files in os.walk(dir_path):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                
            if 'fetch(' in content and '/api/proxy' in content and 'decryptData' not in content:
                new_content = content
                
                # We need to find places where we call .json() on a response that comes from /api/proxy
                # Often it looks like: const data = await response.json();
                # We want to replace it with:
                # const encrypted_data = await response.json(); const data = decryptData(encrypted_data.payload);
                
                new_content = re.sub(
                    r'(const\s+(\w+)\s*=\s*await\s+([a-zA-Z0-9_]+)\.json\(\);)',
                    r'const encrypted_\2 = await \3.json();\n      const \2 = decryptData(encrypted_\2.payload);',
                    new_content
                )

                if new_content != content:
                    if 'use client' in new_content:
                        lines = new_content.split('\n')
                        for i, line in enumerate(lines):
                            if 'use client' in line:
                                lines.insert(i + 1, imports)
                                break
                        new_content = '\n'.join(lines)
                    else:
                        new_content = imports + new_content
                        
                    with open(path, 'w', encoding='utf-8') as f_write:
                        f_write.write(new_content)
