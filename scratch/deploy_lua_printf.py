import paramiko

lua_server = """local socket = require("socket")
local host = "0.0.0.0"
local port = 8080
local server = assert(socket.bind(host, port))
server:settimeout(0.5)

print("Server listening on port " .. port)

while true do
    local client = server:accept()
    if client then
        client:settimeout(5)
        local request, err = client:receive()
        if not err and request then
            print("Received request: " .. request)
            local url = string.match(request, "url=(http[^%s&]+)")
            if url then
                url = string.gsub(url, "%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
                print("Extracted URL: " .. url)
                
                local range = nil
                while true do
                    local line, err = client:receive()
                    if err or line == "" then break end
                    local r = string.match(line, "^[Rr]ange:%s*(.+)")
                    if r then range = r end
                end

                local cmd = "LD_LIBRARY_PATH=/tmp/usr/lib /tmp/usr/bin/curl --raw -s -k -i -L --http1.1"
                if range then
                    cmd = cmd .. " -H \\"Range: " .. range .. "\\""
                end
                cmd = cmd .. " \\"" .. url .. "\\""

                local f = io.popen(cmd, "r")
                if f then
                    while true do
                        local chunk = f:read(4096)
                        if not chunk then break end
                        client:send(chunk)
                    end
                    f:close()
                end
            else
                print("No URL found in request")
                client:send("HTTP/1.1 400 Bad Request\\r\\n\\r\\nBad Request")
            end
        else
            print("Error receiving request: " .. tostring(err))
        end
        client:close()
    end
end
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('192.168.1.1', username='root', password='punisher001', timeout=10)

client.exec_command('rm -f /tmp/proxy_server.lua')

# Write line by line using printf to avoid shell escaping issues
for line in lua_server.splitlines():
    # escape backslashes and double quotes
    safe_line = line.replace('\\', '\\\\').replace('"', '\\"')
    stdin, stdout, stderr = client.exec_command(f'printf "%s\\n" "{safe_line}" >> /tmp/proxy_server.lua')
    stdout.read() # Wait for completion

client.exec_command('killall lua; sleep 1')
client.exec_command('LUA_CPATH="/tmp/usr/lib/lua/?.so" LUA_PATH="/tmp/usr/lib/lua/?.lua" lua /tmp/proxy_server.lua > /tmp/proxy.log 2>&1 &')

print("Done")
