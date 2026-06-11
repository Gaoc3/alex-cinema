import subprocess

def run(cmd):
    print(f"Running: {cmd}")
    subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', cmd])

# 1. proxy.lua
proxy_lua = """cat << 'EOF' > /tmp/proxy.lua
local nixio = require('nixio')
local host = '0.0.0.0'
local port = 8080

local server = nixio.bind(host, port)
if not server then os.exit(1) end
server:listen(128)

while true do
    local client = server:accept()
    if client then
        pcall(function()
            local req = client:recv(8192)
            if req and req ~= '' then
                local method, path = req:match("^(%A+)%s+(%S+)%s+HTTP/")
                local target_url
                if path then
                    target_url = path:match("/cgi%-bin/proxy%?url=(.+)") or path:match("/%?url=(.+)")
                end
                
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
                    local handle = io.popen(cmd)
                    if handle then
                        nixio.nanosleep(0, 500000000)
                        local hfile = io.open('/tmp/h.txt', 'r')
                        if hfile then
                            local headers = hfile:read('*a')
                            hfile:close()
                            headers = headers:gsub('Transfer%-Encoding:%s*chunked\\r\\n', '')
                            client:sendall(headers)
                        else
                            client:sendall('HTTP/1.1 200 OK\\r\\nContent-Type: application/octet-stream\\r\\n\\r\\n')
                        end
                        while true do
                            local chunk = handle:read(8192)
                            if not chunk or chunk == "" then break end
                            client:sendall(chunk)
                        end
                        handle:close()
                    end
                else
                    client:sendall("HTTP/1.1 400 Bad Request\\r\\n\\r\\n")
                end
            end
        end)
        client:close()
    end
end
EOF
"""
run(proxy_lua)

# 2. cinemana init script
init_script = """cat << 'EOF' > /etc/init.d/cinemana
#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

start_service() {
    if [ ! -f /tmp/usr/libexec/ssh-openssh ]; then
        mkdir -p /tmp/usr /tmp/etc /tmp/lib /tmp/opkg-lists
        cp /etc/opkg.conf /tmp/opkg.conf
        sed -i 's|/var/opkg-lists|/tmp/opkg-lists|g' /tmp/opkg.conf
        echo 'dest ram /tmp' >> /tmp/opkg.conf
        opkg -f /tmp/opkg.conf update
        opkg -f /tmp/opkg.conf --dest ram install openssh-client curl
    fi

    procd_open_instance "lua_proxy"
    procd_set_param command lua /tmp/proxy.lua
    procd_set_param respawn
    procd_close_instance

    procd_open_instance "ssh_tunnel"
    procd_set_param env LD_LIBRARY_PATH="/tmp/usr/lib:/tmp/lib"
    procd_set_param command /tmp/usr/libexec/ssh-openssh -i /etc/config/serveo_rsa -o StrictHostKeyChecking=no -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R cinemanamtsky001:80:127.0.0.1:8080 serveo.net
    procd_set_param respawn
    procd_close_instance
}
EOF
"""
run(init_script)

# 3. enable and start
run('chmod +x /etc/init.d/cinemana; /etc/init.d/cinemana enable; /etc/init.d/cinemana restart')
