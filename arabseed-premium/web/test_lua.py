import subprocess
script = """cat << 'EOF' > /tmp/test.lua
local nixio = require('nixio')
local backend, err = nixio.connect('api.cinemana.earthlink.iq', 80)
print("backend=", backend)
print("err=", err)
EOF
lua /tmp/test.lua
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
