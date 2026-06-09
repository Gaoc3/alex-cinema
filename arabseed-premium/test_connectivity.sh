cat > /tmp/test_basic_connect.lua << 'LUAEOF'
local nixio = require("nixio")

local s = nixio.socket("inet", "stream")
print("Connecting to cinemana.shabakaty.com:443...")
local ok, err = s:connect("46.151.64.5", 443)
if ok then
  print("Connected!", ok)
  s:close()
else
  print("Connect failed:", err)
end

local s2 = nixio.socket("inet", "stream")
local ok2, err2 = s2:connect("46.151.64.7", 443)
if ok2 then
  print("Connected to 46.151.64.7:443!")
  s2:close()
else
  print("Connect to 46.151.64.7 failed:", err2)
end
LUAEOF
lua /tmp/test_basic_connect.lua 2>&1