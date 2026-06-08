import os, glob, re

target_dir = r'c:\Users\secon\.openclaw\workspace\student-grades-platform\arabseed-premium\web\src'
pattern = re.compile(r'`https://mtskycinemana\.serveousercontent\.com/cgi-bin/api\?url=(https://cnth2\.shabakaty\.com/[^/]+)/\$\{([^`]+)\}`')

count = 0
for filepath in glob.glob(os.path.join(target_dir, '**', '*.tsx'), recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content, num_subs = pattern.subn(r'`https://mtsky-free-server-docker.hf.space/cgi-bin/api?url=${encodeURIComponent(\'\1/\' + (\2))}`', content)
    
    if num_subs > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += num_subs
        print(f'Updated {num_subs} in {os.path.basename(filepath)}')

print(f'Total replacements: {count}')
