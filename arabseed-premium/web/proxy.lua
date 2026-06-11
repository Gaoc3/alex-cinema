local nixio = require('nixio')
local host = '0.0.0.0'
local port = 8080

local server = nixio.bind(host, port)
if not server then os.exit(1) end

while true do
    local client = server:accept()
    if client then
        local req = client:recv(4096)
        if req and req ~= '' then
            local method, path = req:match('^(%A+)%s+(%S+)%s+HTTP/')
            if path then
                local target_url = 'http://api.cinemana.earthlink.iq' .. path
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
                local cmd = 'curl -s -D /tmp/h.txt ' .. range_header .. auth_header .. '-H \'Host: api.cinemana.earthlink.iq\' \'' .. target_url .. '\''
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
            end
        end
        client:close()
    end
end
