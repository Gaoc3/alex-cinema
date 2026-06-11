import subprocess
script = """cat << 'EOF' > /tmp/proxy.lua
local nixio = require('nixio')
local host = '0.0.0.0'
local port = 8080

local server = nixio.bind(host, port)
if not server then os.exit(1) end
server:listen(128)

local log = io.open('/tmp/lua_debug.txt', 'w')
log:write('Server started\\n')
log:flush()

while true do
    local client = server:accept()
    if client then
        log:write('Client connected\\n')
        log:flush()
        local req = client:recv(8192)
        log:write('Req: ' .. tostring(req) .. '\\n')
        log:flush()
        
        client:sendall("HTTP/1.1 200 OK\\r\\nContent-Length: 2\\r\\n\\r\\nOK")
        client:close()
    end
end
EOF
killall lua; /etc/init.d/cinemana start; sleep 2
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
