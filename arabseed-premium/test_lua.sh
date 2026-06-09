cat > /tmp/test_lua.lua << 'LUAEOF'
local nixio = require("nixio")
print("nixio loaded")
local s, err = nixio.socket("inet", "stream")
if not s then
  print("socket error:", err)
  return
end
print("socket:", s)
local ok, err = s:connect("46.151.64.7", 443)
if not ok then
  print("connect error:", err)
  return
end
print("connected:", ok)
s:close()
print("done")
LUAEOF
lua /tmp/test_lua.lua 2>&1