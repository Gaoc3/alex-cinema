cat > /tmp/test_poll4.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
local IN = nixio.poll_flags("in")
local OUT = nixio.poll_flags("out")
local ERR = nixio.poll_flags("err")
local HUP = nixio.poll_flags("hup")

local tests = {
  {"flat {fd=s, events=IN}", function() return nixio.poll({fd=s, events=IN}, 100) end},
  {"array {{fd=s, events=IN}}", function() return nixio.poll({{fd=s, events=IN}}, 100) end},
  {"dict {[s]=IN}", function() return nixio.poll({[s]=IN}, 100) end},
}

for _, t in ipairs(tests) do
  local ok, r1, r2, r3 = pcall(t[2])
  if ok then
    print("OK " .. t[1])
    print("  r1=" .. tostring(r1) .. " type=" .. type(r1))
    print("  r2=" .. tostring(r2) .. " type=" .. type(r2))
    if type(r2) == "table" then
      for i, v in ipairs(r2) do
        print("    r2[" .. i .. "] type=" .. type(v))
        if type(v) == "table" then
          for k, val in pairs(v) do print("      " .. k .. " = " .. tostring(val)) end
        else
          print("      value=" .. tostring(v))
        end
      end
    end
    if r3 then print("  r3=" .. tostring(r3)) end
  else
    print("FAIL " .. t[1] .. ": " .. r1)
  end
end
LUAEOF
lua /tmp/test_poll4.lua 2>&1