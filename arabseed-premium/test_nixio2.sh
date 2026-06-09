cat > /tmp/test_nixio2.lua << 'LUAEOF'
local nixio = require("nixio")

-- Check DNS resolution
local ok, addrs = pcall(nixio.getaddrinfo, "cdn.shabakaty.com", 443)
if ok then
  for _, a in ipairs(addrs or {}) do
    if type(a) == "table" then
      for k, v in pairs(a) do print(k, v) end
    else
      print("addr:", a)
    end
  end
else
  print("getaddrinfo failed:", addrs)
end

-- Check raw socket recv with MSG_PEEK
local s = nixio.socket("inet", "stream")
s:setpeername("cdn.shabakaty.com", 443)
local ok, err = s:connect()
print("connect:", ok, err)
if ok then
  -- Send a minimal TLS ClientHello to get the cert
  local hello = string.char(0x16, 0x03, 0x01, 0x00, 0x00)
  local sent, err = s:send(hello)
  print("sent:", sent, err)
  local data, err = s:recv(4096)
  print("recv:", data and #data or 0, err)
  s:close()
end

-- Check nixio poll
local p = nixio.poll
print("poll available:", p ~= nil)
LUAEOF

cat > /tmp/test_nixio3.lua << 'LUAEOF'
local nixio = require("nixio")

-- Check if nixio can bind/listen
local s = nixio.socket("inet", "stream")
local ok, err = s:bind("127.0.0.1", 18443)
print("bind:", ok, err)

-- Check listen/accept
local mt = getmetatable(s)
if mt then
  print("metatable methods:")
  for k, v in pairs(mt) do
    print("  ", k, type(v))
  end
  if mt.__index then
    for k, v in pairs(mt.__index) do
      print("  __index:", k, type(v))
    end
  end
end

-- Print all methods
print("all socket methods:")
for k, v in pairs(s) do
  print("  ", k, type(v))
end

s:close()
LUAEOF

echo "=== Test 2 ==="
lua /tmp/test_nixio2.lua 2>&1
echo ""
echo "=== Test 3 ==="
lua /tmp/test_nixio3.lua 2>&1