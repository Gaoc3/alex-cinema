# Debug version - logs SNI parsing
cat > /usr/bin/sni-proxy.lua << 'LUAEOF'
#!/usr/bin/lua
local nixio = require("nixio")
local dns = {}

local function has_bit(v, b) return math.floor(v / b) % 2 == 1 end

local function resolve(name)
  io.stderr:write("DNS resolve: " .. name .. "\n")
  io.stderr:flush()
  if dns[name] then return dns[name] end
  local ok, addrs = pcall(nixio.getaddrinfo, name, "inet", 0)
  if ok and addrs and #addrs > 0 then
    for _, a in ipairs(addrs) do
      if a and a.address then dns[name] = a.address; return a.address end
    end
  end
  io.stderr:write("DNS failed for: " .. name .. "\n")
  io.stderr:flush()
  return nil
end

local function parse_sni(data)
  io.stderr:write("parse_sni called with " .. #data .. " bytes\n")
  io.stderr:flush()
  if not data or #data < 5 then io.stderr:write("too short\n"); io.stderr:flush(); return nil end
  if data:byte(1) ~= 0x16 then io.stderr:write("not TLS handshake: " .. data:byte(1) .. "\n"); io.stderr:flush(); return nil end
  local pos = 9
  if #data <= pos then return nil end
  pos = pos + 34
  if #data <= pos then return nil end
  local sid_len = data:byte(pos)
  pos = pos + 1 + sid_len
  if #data <= pos then return nil end
  local cs_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2 + cs_len
  if #data <= pos then return nil end
  local comp_len = data:byte(pos)
  pos = pos + 1 + comp_len
  if #data < pos + 2 then return nil end
  local ext_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2
  local ext_end = math.min(pos + ext_len, #data)
  io.stderr:write("ext from " .. pos .. " to " .. ext_end .. "\n")
  io.stderr:flush()
  while pos + 4 <= ext_end do
    local et = data:byte(pos) * 256 + data:byte(pos + 1)
    local edl = data:byte(pos + 2) * 256 + data:byte(pos + 3)
    pos = pos + 4
    if ext_end < pos + edl then break end
    io.stderr:write("  ext type=" .. et .. " len=" .. edl .. "\n")
    io.stderr:flush()
    if et == 0 then
      if pos + 2 > pos + edl then break end
      local sni_list_len = data:byte(pos) * 256 + data:byte(pos + 1)
      local sp = pos + 2
      while sp + 3 < pos + edl do
        local name_type = data:byte(sp)
        local nl = data:byte(sp + 1) * 256 + data:byte(sp + 2)
        if #data >= sp + 3 + nl then
          if name_type == 0 then
            local name = data:sub(sp + 3, sp + 3 + nl - 1)
            io.stderr:write("  FOUND SNI: " .. name .. "\n")
            io.stderr:flush()
            return name
          end
        end
        sp = sp + 3 + nl
      end
    end
    pos = pos + edl
  end
  io.stderr:write("no SNI found\n")
  io.stderr:flush()
  return nil
end

local function pump(src, dst, ms)
  local deadline = nixio.gettimeofday() + ms / 1000
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then break end
    local events = nixio.poll({src}, {}, {}, math.max(1, (deadline - now) * 1000))
    if not events or #events == 0 then break end
    local f = events[1].events
    if has_bit(f, 8) or has_bit(f, 16) or has_bit(f, 32) then break end
    if has_bit(f, 1) then
      local data, err = src:recv(16384)
      if not data or #data == 0 then break end
      if not dst:send(data) then break end
    end
  end
end

local function handle(client)
  io.stderr:write("handle: new connection\n")
  io.stderr:flush()
  local data, err = client:recv(8192)
  if not data or #data == 0 then io.stderr:write("no data from client\n"); io.stderr:flush(); client:close(); return end
  io.stderr:write("received " .. #data .. " bytes from client, first byte=" .. data:byte(1) .. "\n")
  io.stderr:flush()
  local sni = parse_sni(data)
  if not sni then io.stderr:write("SNI not found, closing\n"); io.stderr:flush(); client:close(); return end
  local ip = resolve(sni)
  if not ip then io.stderr:write("resolve failed\n"); io.stderr:flush(); client:close(); return end
  io.stderr:write("connecting to " .. ip .. ":443\n")
  io.stderr:flush()
  local target = nixio.socket("inet", "stream")
  if not target then io.stderr:write("socket failed\n"); io.stderr:flush(); client:close(); return end
  local ok, err = target:connect(ip, 443)
  if not ok then io.stderr:write("connect failed: " .. tostring(err) .. "\n"); io.stderr:flush(); target:close(); client:close(); return end
  io.stderr:write("connected, sending " .. #data .. " bytes to target\n")
  io.stderr:flush()
  target:send(data)
  local pid = nixio.fork()
  if pid == -1 then io.stderr:write("fork failed\n"); io.stderr:flush(); target:close(); client:close(); return end
  if pid == 0 then
    io.stderr:write("child: forwarding client->target\n")
    io.stderr:flush()
    pump(client, target, 300000)
    target:shutdown(1); target:close()
    os.exit(0)
  end
  io.stderr:write("parent: forwarding target->client\n")
  io.stderr:flush()
  pump(target, client, 300000)
  client:shutdown(1)
  nixio.wait(pid)
  io.stderr:write("done\n")
  io.stderr:flush()
  client:close(); target:close()
end

local port = tonumber(arg[1]) or 8443
local bind_addr = arg[2] or "127.0.0.1"
io.stderr:write("Starting SNI proxy on " .. bind_addr .. ":" .. port .. "\n")
io.stderr:flush()

local server = nixio.socket("inet", "stream")
server:setopt("socket", "reuseaddr", 1)
local ok, err = server:bind(bind_addr, port)
if not ok then io.stderr:write("bind failed\n"); io.stderr:flush(); server:close(); return end
server:listen(50)
while true do
  local client, err = server:accept()
  if client then
    local pid = nixio.fork()
    if pid == 0 then
      server:close()
      handle(client)
      os.exit(0)
    else
      client:close()
      repeat
        local wpid, status = pcall(nixio.wait, -1, "nohang")
      until not wpid or wpid == 0
    end
  else
    nixio.nanosleep(0.1)
  end
end
LUAEOF
chmod +x /usr/bin/sni-proxy.lua
killall lua 2>/dev/null; sleep 2
lua /usr/bin/sni-proxy.lua 8443 0.0.0.0 > /tmp/sni-proxy.log 2>&1 &
sleep 3
echo "=== PID ==="
ps | grep lua | grep -v grep
netstat -tlnp 2>/dev/null | grep :8443
echo "=== Log ==="
cat /tmp/sni-proxy.log 2>/dev/null