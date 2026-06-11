import subprocess
script = """cat << 'EOF' > /tmp/proxy.lua
local nixio = require('nixio')
local host = '0.0.0.0'
local port = 8080

local server = nixio.bind(host, port)
if not server then os.exit(1) end
server:listen(128)

while true do
    local client = server:accept()
    if client then
        local req = client:recv(8192)
        if req and req ~= '' then
            local target_url = req:match("GET /cgi%-bin/proxy%?url=([^%s]+)") or req:match("GET /%?url=([^%s]+)")
            if target_url then
                target_url = target_url:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
                
                local range_header = ''
                local auth_header = ''
                for line in req:gmatch('[^\r\n]+') do
                    local key, val = line:match('^(.-):%s*(.*)')
                    if key then
                        if key:lower() == 'range' then
                            range_header = '-H \'Range: ' .. val .. '\' '
                        elseif key:lower() == 'authorization' then
                            auth_header = '-H \'Authorization: ' .. val .. '\' '
                        end
                    end
                end
                os.remove('/tmp/h.txt')
                local cmd = 'LD_LIBRARY_PATH=/tmp/usr/lib:/tmp/lib /tmp/usr/bin/curl -s -k -D /tmp/h.txt ' .. range_header .. auth_header .. '-H \'Host: cinemana.shabakaty.com\' \'' .. target_url .. '\' 2> /tmp/curl_err.txt'
                local handle = io.popen(cmd)
                if handle then
                    nixio.nanosleep(0, 500000000)
                    local hfile = io.open('/tmp/h.txt', 'r')
                    if hfile then
                        local headers = hfile:read('*a')
                        hfile:close()
                        headers = headers:gsub('Transfer%-Encoding:%s*chunked\r\n', '')
                        client:sendall(headers)
                    else
                        client:sendall('HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\n\r\n')
                    end
                    while true do
                        local chunk = handle:read(4096)
                        if not chunk then break end
                        client:sendall(chunk)
                    end
                    handle:close()
                end
            else
                client:sendall("HTTP/1.1 400 Bad Request\r\n\r\n")
            end
        end
        client:close()
    end
end
EOF
killall lua; /etc/init.d/cinemana start; sleep 2
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
