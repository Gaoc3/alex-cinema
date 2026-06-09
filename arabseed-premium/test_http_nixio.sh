cat > /tmp/test_http.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
s:setopt("tcp", "nodelay", 1)
local ok, err = s:connect("46.151.64.5", 443)
print("connect:", ok, err)
local req = "GET / HTTP/1.0\r\nHost: cinemana.shabakaty.com\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
local sent, serr = s:send(req)
print("sent:", sent, serr)
local data = s:recv(16384)
print("recv:", data and #data or "nil")
if data and #data > 0 then
  print("First 200:", data:sub(1, 200))
end
s:close()
LUAEOF
lua /tmp/test_http.lua 2>&1