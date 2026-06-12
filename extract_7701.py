import json

with open(r'C:\Users\secon\.gemini\antigravity\brain\a5b6273e-343c-4f30-b900-0eabe75fef0d\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":7701' in line:
            step = json.loads(line)
            with open('deploy_nginx_original.py', 'w', encoding='utf-8') as out:
                out.write(step['tool_calls'][0]['args']['CodeContent'])
            break
