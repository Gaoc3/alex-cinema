cat > /usr/bin/sni-proxy.lua << 'LUAEOF'
#!/usr/bin/lua
local nixio = require("nixio")
local dns = {}
local IN = nixio.poll_flags("in")
local HUP = nixio.poll_flags("hup")
local ERR = nixio.poll_flags("err")
local NVAL = nixio.poll_flags("nval")

local function has_bit(v, b)
  return math.floor(v / b) % 2 == 1
end

local function resolve(name)
  if dns[name] then return dns[name] end
  local ok, addrs = pcall(nixio.getaddrinfo, name, "inet", 0)
  if ok and addrs and #addrs > 0 then
    for _, a in ipairs(addrs) do
      if a and a.address then dns[name] = a.address; return a.address end
    end
  end
  return nil
end

local function parse_sni(data)
  if not data or #data < 5 or data:byte(1) ~= 0x16 then return nil end
  local pos = 10
  if #data <= pos then return nil end
  pos = pos + 2
  pos = pos + 32
  if #data <= pos then return nil end
  local sid_len = data:byte(pos)
  pos = pos + 1 + sid_len
  if #data < pos + 2 then return nil end
  local cs_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2 + cs_len
  if #data < pos + 1 then return nil end
  local comp_len = data:byte(pos)
  pos = pos + 1 + comp_len
  if #data < pos + 2 then return nil end
  local ext_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2
  local ext_end = pos + ext_len
  if #data < ext_end then ext_end = #data end
  while pos + 4 <= ext_end do
    local et = data:byte(pos) * 256 + data:byte(pos + 1)
    local edl = data:byte(pos + 2) * 256 + data:byte(pos + 3)
    pos = pos + 4
    if pos + edl > ext_end then break end
    if et == 0 then
      if pos + 2 > pos + edl then break end
      local sni_list_len = data:byte(pos) * 256 + data:byte(pos + 1)
      local sp = pos + 2
      while sp + 3 <= pos + edl do
        local name_type = data:byte(sp)
        local nl = data:byte(sp + 1) * 256 + data:byte(sp + 2)
        if sp + 3 + nl > pos + edl then break end
        if name_type == 0 then
          return data:sub(sp + 3, sp + 3 + nl - 1)
        end
        sp = sp + 3 + nl
      end
    end
    pos = pos + edl
  end
  return nil
end

local function pump(src, dst, ms)
  local deadline = nixio.gettimeofday() + ms / 1000
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then break end
    local ret, events = nixio.poll({{fd=src, events=IN}}, math.max(1, (deadline - now) * 1000))
    if not ret or ret == 0 then break end
    if events and events[1] then
      local rev = events[1].revents
      if has_bit(rev, ERR) or has_bit(rev, HUP) or has_bit(rev, NVAL) then break end
      if has_bit(rev, IN) then
        local data, err = src:recv(16384)
        if not data or #data == 0 then break end
        if not dst:send(data) then break end
      end
    end
  end
end

local function handle(client)
  local data = client:recv(8192)
  if not data or #data == 0 then client:close(); return end
  local sni = parse_sni(data)
  if not sni then client:close(); return end
  local ip = resolve(sni)
  if not ip then client:close(); return end
  local target = nixio.socket("inet", "stream")
  if not target then client:close(); return end
  local ok, err = target:connect(ip, 443)
  if not ok then target:close(); client:close(); return end
  target:send(data)
  local pid = nixio.fork()
  if pid == -1 then target:close(); client:close(); return end
  if pid == 0 then
    pump(client, target, 120000)
    target:shutdown("write"); target:close()
    os.exit(0)
  end
  pump(target, client, 120000)
  client:shutdown("write")
  nixio.wait(pid)
  client:close(); target:close()
end

local port = tonumber(arg[1]) or 8443
local bind_addr = arg[2] or "127.0.0.1"
local server = nixio.socket("inet", "stream")
server:setopt("socket", "reuseaddr", 1)
local ok, err = server:bind(bind_addr, port)
if not ok then server:close(); return end
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
      pcall(nixio.wait, -1, "nohang")
    end
  else
    nixio.nanosleep(0.1)
  end
end
LUAEOF
chmod +x /usr/bin/sni-proxy.lua
echo "Deployed clean version"

# Start
lua /usr/bin/sni-proxy.lua 8443 0.0.0.0 > /dev/null 2>&1 &
sleep 2
echo "=== Status ==="
netstat -tlnp 2>/dev/null | grep :8443
ps | grep lua | grep -v grep