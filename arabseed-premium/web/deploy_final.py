import subprocess

def run(cmd):
    print(f"Running: {cmd}")
    subprocess.run(['python', 'C:\\Users\\secon\\.gemini\\antigravity\\brain\\a5b6273e-343c-4f30-b900-0eabe75fef0d\\scratch\\ssh_router.py', cmd])

# 1. proxy.lua
proxy_lua = """cat << 'EOF' > /etc/config/proxy.lua
local nixio = require('nixio')
local host = '0.0.0.0'
local port = 8080

local server = nixio.bind(host, port)
if not server then os.exit(1) end

while true do
    local client = server:accept()
    if client then
        local req = client:recv(8192)
        if req and req ~= '' then
            local method, path = req:match('^(%A+)%s+(%S+)%s+HTTP/')
            if method and path then
                local backend = nixio.connect('api.cinemana.earthlink.iq', '80', 'inet', 'stream')
                if backend then
                    local body_start = req:find('\\r\\n\\r\\n', 1, true)
                    local req_head = req:sub(1, body_start and (body_start - 1) or #req)
                    local req_body = body_start and req:sub(body_start + 4) or ''
                    
                    local new_req = method .. ' ' .. path .. ' HTTP/1.1\\r\\n'
                    new_req = new_req .. 'Host: api.cinemana.earthlink.iq\\r\\n'
                    
                    for line in req_head:gmatch('[^\\r\\n]+') do
                        local key, val = line:match('^(.-):%s*(.*)')
                        if key then
                            local kl = key:lower()
                            if kl ~= 'host' and kl ~= 'connection' then
                                new_req = new_req .. key .. ': ' .. val .. '\\r\\n'
                            end
                        end
                    end
                    new_req = new_req .. 'Connection: close\\r\\n\\r\\n' .. req_body
                    
                    backend:sendall(new_req)
                    
                    while true do
                        local chunk = backend:recv(8192)
                        if not chunk or chunk == '' then break end
                        client:sendall(chunk)
                    end
                    backend:close()
                else
                    client:sendall('HTTP/1.1 502 Bad Gateway\\r\\nConnection: close\\r\\n\\r\\n')
                end
            end
        end
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
        opkg -f /tmp/opkg.conf --dest ram install openssh-client
    fi

    procd_open_instance "lua_proxy"
    procd_set_param command lua /etc/config/proxy.lua
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
