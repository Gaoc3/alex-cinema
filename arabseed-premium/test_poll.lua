cat > /tmp/test_poll.lua << 'LUAEOF'
local nixio = require("nixio")
print("poll_flags:", nixio.poll_flags)
local r = nixio.poll_flags("in")
print("in flag:", r)
local w = nixio.poll_flags("out")
print("out flag:", w)

-- Test getaddrinfo
local ok, res = pcall(nixio.getaddrinfo, "cdn.shabakaty.com", "inet", 443)
print("getaddrinfo ok:", ok)
if ok and res then
  for i, v in ipairs(res) do
    print("  result", i, type(v))
    if type(v) == "table" then
      for k2, v2 in pairs(v) do print("    ", k2, v2) end
    end
  end
end
LUAEOF
lua /tmp/test_poll.lua 2>&1