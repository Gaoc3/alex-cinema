cat > /tmp/test_http2.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
s:setopt("tcp", "nodelay", 1)
local ok, err = s:connect("46.151.64.5", 443)
print("connect:", ok, err)

local req = "GET / HTTP/1.0\r\nHost: cinemana.shabakaty.com\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
s:send(req)
print("sent request")

-- Poll for response
local IN = nixio.poll_flags("in")
print("IN flag:", IN)
local count, events = nixio.poll({{fd=s, events=IN}}, 10000)
print("poll count:", count)
if events and events[1] then
  print("revents:", events[1].revents)
end

local data = s:recv(16384)
print("recv:", data and #data or "nil")
if data and #data > 0 then
  print("First 300:", data:sub(1, 300))
end
s:close()
LUAEOF
lua /tmp/test_http2.lua 2>&1