cat > /tmp/test_poll2.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")

-- Test various poll fd structures
local tests = {}

tests["{{fd=s, events=1}}"] = function()
  return nixio.poll({{fd=s, events=1}}, 100)
end

tests["{{s, 1}}"] = function()
  return nixio.poll({{s, 1}}, 100)
end

tests["{[s]=1}"] = function()
  return nixio.poll({[s]=1}, 100)
end

tests["{fd=s, events=1}"] = function()
  return nixio.poll({fd=s, events=1}, 100)
end

-- Actually connect and try with data
for name, fn in pairs(tests) do
  local ok, res = pcall(fn)
  if ok then
    print("OK " .. name .. " =>", type(res), res)
  else
    print("FAIL " .. name .. " =>", res)
  end
end
LUAEOF
lua /tmp/test_poll2.lua 2>&1