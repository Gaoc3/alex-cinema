# Write fixed SNI proxy (Lua 5.1 compatible - no bitwise ops)
cat > /usr/bin/sni-proxy.lua << 'LUAEOF'
#!/usr/bin/lua
local nixio = require("nixio")
local dns_cache = {}

local function has_bit(val, b)
  return math.floor(val / b) % 2 == 1
end

local function resolve(name)
  local c = dns_cache[name]
  if c then return c end
  local ok, addrs = pcall(nixio.getaddrinfo, name, "inet", 0)
  if ok and addrs and #addrs > 0 then
    for _, a in ipairs(addrs) do
      if a and a.address then
        dns_cache[name] = a.address
        return a.address
      end
    end
  end
  return name
end

local function parse_sni(data)
  if not data or #data < 5 or data:byte(1) ~= 0x16 then return nil end
  local pos = 9
  if #data <= pos then return nil end
  pos = pos + 34
  if #data <= pos then return nil end
  pos = pos + 1 + data:byte(pos)
  if #data <= pos then return nil end
  local cs_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2 + cs_len
  if #data <= pos then return nil end
  pos = pos + 1 + data:byte(pos)
  if #data < pos + 2 then return nil end
  local ext_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2
  local ext_end = math.min(pos + ext_len, #data)
  while pos + 4 <= ext_end do
    local ext_type = data:byte(pos) * 256 + data:byte(pos + 1)
    local ext_data_len = data:byte(pos + 2) * 256 + data:byte(pos + 3)
    pos = pos + 4
    if ext_end < pos + ext_data_len then break end
    if ext_type == 0 then
      local sni_pos = pos + 2
      while sni_pos + 3 < pos + ext_data_len do
        if data:byte(sni_pos) == 0 then
          local name_len = data:byte(sni_pos + 1) * 256 + data:byte(sni_pos + 2)
          if #data >= sni_pos + 3 + name_len then
            return data:sub(sni_pos + 3, sni_pos + 3 + name_len - 1)
          end
        end
        local entry_len = data:byte(sni_pos + 1) * 256 + data:byte(sni_pos + 2)
        sni_pos = sni_pos + 3 + entry_len
      end
    end
    pos = pos + ext_data_len
  end
  return nil
end

local function copy_data(src, dst, timeout_ms)
  local deadline = nixio.gettimeofday() + timeout_ms / 1000
  local buf = ""
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then break end
    local events = nixio.poll({src}, {}, {}, (deadline - now) * 1000)
    if not events or #events == 0 then break end
    local ev = events[1]
    local f = ev.events
    if has_bit(f, 8) or has_bit(f, 16) or has_bit(f, 32) then break end
    if has_bit(f, 1) then
      local data, err = src:recv(16384)
      if not data or #data == 0 then break end
      local sent, err2 = dst:send(data)
      if not sent then break end
    end
  end
end

local function handle(client)
  local data, err = client:recv(8192)
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
    copy_data(client, target, 300000)
    target:shutdown(1); target:close()
    os.exit(0)
  end
  copy_data(target, client, 300000)
  client:shutdown(1)
  nixio.wait(pid)
  client:close(); target:close()
end

local port = tonumber(arg[1]) or 8443
local bind_addr = arg[2] or "127.0.0.1"
local server = nixio.socket("inet", "stream")
server:setopt("reuseaddr", 1)
local ok, err = server:bind(bind_addr, port)
if not ok then server:close(); return end
server:listen(50)
while true do
  local client, err = server:accept()
  if client then
    local pid = nixio.fork()
    if pid == 0 then server:close(); handle(client); os.exit(0)
    else
      client:close()
      repeat
        local wpid, status = nixio.wait(-1, 1)
      until not wpid or wpid == 0
    end
  else
    nixio.nanosleep(0.1)
  end
end
server:close()
LUAEOF
chmod +x /usr/bin/sni-proxy.lua

# Start and test
killall sni-proxy.lua 2>/dev/null; sleep 1
lua /usr/bin/sni-proxy.lua 8443 127.0.0.1 &
sleep 2

echo "=== Port 8443 ==="
netstat -tlnp 2>/dev/null | grep :8443 || echo "NOT LISTENING"

echo ""
echo "=== Quick test: forward port 80 to SNI proxy? ==="
echo "Keeping httpd on 80, proxy on 8443"