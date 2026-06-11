import subprocess
script = """cat << 'EOF' > /tmp/test_methods.lua
local s = require("nixio").socket("inet", "stream")
for k, v in pairs(getmetatable(s).__index) do
    print(k)
end
EOF
lua /tmp/test_methods.lua
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
