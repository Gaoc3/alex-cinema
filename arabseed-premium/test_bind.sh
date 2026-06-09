cat > /tmp/test_bind.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
s:setopt("socket", "reuseaddr", 1)

-- Try different formats for bind all
local tests = {"0.0.0.0", "*", "", "0", "::"}
for _, addr in ipairs(tests) do
  local ok, err = s:bind(addr, 18444)
  if ok then
    print("Bind OK:", addr)
    s:close()
    return
  else
    print("Bind FAIL:", addr, err)
  end
end

-- Try numeric
local nix = nixio
local ok, err = nixio.bind(2, 18444) -- AF_INET = 2
print("nixio.bind:", ok, err)
LUAEOF
lua /tmp/test_bind.lua 2>&1