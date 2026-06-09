cat > /tmp/test_poll3.lua << 'LUAEOF'
local nixio = require("nixio")

-- Use a TCP connection to test poll
local s = nixio.socket("inet", "stream")
s:setopt("socket", "reuseaddr", 1)
s:bind("127.0.0.1", 0)
s:listen(1)

-- Try to get the port
-- Use getsockname if available
local ok, name = pcall(s.getsockname, s)
local port = 0
if ok and name then
  port = name.port or name
end
print("server port:", port)

-- Because we don't know the port, let's just test with a connected socket
-- Actually, create a pipe-like scenario: connect to ourselves
-- We know the listen port. Connect from another socket.
local c = nixio.socket("inet", "stream")
if port and port > 0 then
  local ok2, err2 = pcall(c.connect, c, "127.0.0.1", port)
  print("connect:", ok2, err2)
end

-- Accept
local client = s:accept()
print("client:", client)

if client then
  -- Send some test data
  client:send("hello")
  
  -- Test poll on the accepting socket (which now has data)
  local n, revents = nixio.poll({fd=client, events=1}, 1000)
  print("poll n=", n, "revents type=", type(revents))
  if revents then
    if type(revents) == "table" then
      for i, t in ipairs(revents) do
        print("  #" .. i .. ": ", t)
        if type(t) == "table" then
          for k, v in pairs(t) do print("    " .. tostring(k) .. " = " .. tostring(v)) end
        end
      end
    else
      print("  revents value:", revents)
    end
  end
  
  client:close()
end

s:close()
c:close()
print("done")
LUAEOF
lua /tmp/test_poll3.lua 2>&1