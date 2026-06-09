cat > /tmp/test_setopt.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
print("socket created:", s)

local ok, err = s:setopt("socket", "reuseaddr", 1)
print("socket reuseaddr:", ok, err)

local ok2, err2 = s:setopt("tcp", "nodelay", 1)
print("tcp nodelay:", ok2, err2)

-- Try without category
local ok3, err3 = pcall(s.setopt, s, "reuseaddr", 1)
print("no-category reuseaddr:", ok3, err3)
s:close()
print("done")
LUAEOF
lua /tmp/test_setopt.lua 2>&1