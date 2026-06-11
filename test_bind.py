import subprocess
script = """cat << 'EOF' > /tmp/test_bind.lua
local nixio = require('nixio')
local s, err = nixio.bind('0.0.0.0', 8080)
print('socket:', s)
print('error:', err)
EOF
lua /tmp/test_bind.lua
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
