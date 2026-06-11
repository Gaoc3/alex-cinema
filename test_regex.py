import subprocess
script = """cat << 'EOF' > /tmp/test_regex.lua
local h = "HTTP/1.1 302 Found\\r\\nLocation: x\\r\\n\\r\\nHTTP/1.1 200 OK\\r\\nServer: y\\r\\n\\r\\n"
local last = h:match(".*(HTTP/1%.[01].-\\r\\n\\r\\n)")
print(last)
EOF
lua /tmp/test_regex.lua
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
