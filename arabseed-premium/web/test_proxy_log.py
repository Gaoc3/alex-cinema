import subprocess
script = """cat << 'EOF' > /tmp/proxy.lua
local nixio = require('nixio')
local host = '0.0.0.0'
local port = 8080

local server = nixio.bind(host, port)
if not server then os.exit(1) end
server:listen(128)

local log = io.open('/tmp/proxy_log.txt', 'w')
log:write("Proxy started\\n")
log:flush()

while true do
    local client = server:accept()
    if client then
        log:write("Client connected\\n")
        log:flush()
        local success, err = pcall(function()
            local req = client:recv(8192)
            log:write("Request length: " .. (req and #req or 0) .. "\\n")
            if req and req ~= '' then
                local method, path = req:match("^(%a+)%s+(%S+)%s+HTTP/")
                log:write("Method: " .. tostring(method) .. ", Path: " .. tostring(path) .. "\\n")
                
                local target_url
                if path then
                    target_url = path:match("/cgi%-bin/proxy%?url=(.+)") or path:match("/%?url=(.+)")
                end
                log:write("Target URL: " .. tostring(target_url) .. "\\n")
                
                if method and target_url then
                    target_url = target_url:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
                    
                    local range_header = ''
                    local auth_header = ''
                    for line in req:gmatch('[^\\r\\n]+') do
                        local key, val = line:match('^(.-):%s*(.*)')
                        if key then
                            if key:lower() == 'range' then
                                range_header = '-H \\'Range: ' .. val .. '\\' '
                            elseif key:lower() == 'authorization' then
                                auth_header = '-H \\'Authorization: ' .. val .. '\\' '
                            end
                        end
                    end
                    os.remove('/tmp/h.txt')
                    local cmd = 'LD_LIBRARY_PATH=/tmp/usr/lib:/tmp/lib /tmp/usr/bin/curl -s -k -D /tmp/h.txt ' .. range_header .. auth_header .. '-H \\'Host: cinemana.shabakaty.com\\' \\'' .. target_url .. '\\''
                    log:write("Executing: " .. cmd .. "\\n")
                    log:flush()
                    
                    local handle = io.popen(cmd)
                    if handle then
                        nixio.nanosleep(0, 500000000)
                        local hfile = io.open('/tmp/h.txt', 'r')
                        if hfile then
                            local headers = hfile:read('*a')
                            hfile:close()
                            headers = headers:gsub('Transfer%-Encoding:%s*chunked\\r\\n', '')
                            log:write("Sending headers: " .. #headers .. " bytes\\n")
                            client:sendall(headers)
                        else
                            log:write("No headers from curl!\\n")
                            client:sendall('HTTP/1.1 200 OK\\r\\nContent-Type: application/octet-stream\\r\\n\\r\\n')
                        end
                        log:flush()
                        
                        local total_sent = 0
                        while true do
                            local chunk = handle:read(8192)
                            if not chunk or chunk == "" then break end
                            client:sendall(chunk)
                            total_sent = total_sent + #chunk
                        end
                        log:write("Total sent body: " .. total_sent .. " bytes\\n")
                        handle:close()
                    else
                        log:write("Failed to popen\\n")
                    end
                else
                    log:write("Bad request matching\\n")
                    client:sendall("HTTP/1.1 400 Bad Request\\r\\n\\r\\n")
                end
            end
        end)
        if not success then
            log:write("Error in pcall: " .. tostring(err) .. "\\n")
        end
        log:flush()
        client:close()
    end
end
EOF
killall lua; /etc/init.d/cinemana start; sleep 2
"""
subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', script])
