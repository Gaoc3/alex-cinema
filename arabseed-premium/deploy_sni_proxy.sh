# Write SNI proxy
cat > /usr/bin/sni-proxy.lua << 'LUAEOF'
#!/usr/bin/lua
local nixio = require("nixio")
local dns_cache = {}

local function resolve(name)
  if dns_cache[name] then return dns_cache[name] end
  local ok, addrs = pcall(nixio.getaddrinfo, name, "inet", 0)
  if ok and addrs and #addrs > 0 then
    for _, a in ipairs(addrs) do
      if a and a.address then dns_cache[name] = a.address; return a.address end
    end
  end
  return name
end

local function parse_sni(data)
  if not data or #data < 5 or data:byte(1) ~= 0x16 then return nil end
  local pos = 9 -- record(5) + handshake_type(1) + length(3)
  if #data <= pos then return nil end
  pos = pos + 2 + 32 -- version + random
  if #data <= pos then return nil end
  pos = pos + 1 + data:byte(pos) -- session id
  if #data <= pos then return nil end
  local cs_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2 + cs_len
  if #data <= pos then return nil end
  pos = pos + 1 + data:byte(pos) -- compression
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
        sni_pos = sni_pos + 3 + data:byte(sni_pos + 1) * 256 + data:byte(sni_pos + 2)
      end
    end
    pos = pos + ext_data_len
  end
  return nil
end

local function copy_data(src, dst, timeout_ms)
  local deadline = nixio.gettimeofday() + timeout_ms / 1000
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then break end
    local events = nixio.poll({src}, {}, {}, (deadline - now) * 1000)
    if not events or #events == 0 then break end
    local ev = events[1]
    if ev.events & (8|16|32) ~= 0 then break end
    if ev.events & 1 ~= 0 then
      local data, err = src:recv(16384)
      if not data or #data == 0 then break end
      if not dst:send(data) then break end
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
    else client:close()
      repeat local w, s = nixio.wait(-1, 1) until not w or w == 0
    end
  else nixio.nanosleep(0.1) end
end
server:close()
LUAEOF
chmod +x /usr/bin/sni-proxy.lua

# Test: start proxy on 8443, then try connecting through it
killall sni-proxy.lua 2>/dev/null
sleep 1
lua /usr/bin/sni-proxy.lua 8443 127.0.0.1 &
sleep 2

echo "=== Server on 8443 ==="
netstat -tlnp 2>/dev/null | grep :8443

echo ""
echo "=== Test: connect to cdn.shabakaty.com via SNI proxy ==="
# Use nc to send a TLS ClientHello for cdn.shabakaty.com and see if we get a response
# We'll manually craft a minimal TLS ClientHello
echo "Testing connection..."
(
  # Connect to the proxy
  exec 3<>/dev/tcp/127.0.0.1/8443
  # Send minimal TLS ClientHello for cdn.shabakaty.com
  # ClientHello: type=0x16, version=0x0301, length=...
  # We'll use openssl if available, otherwise just test with a simple handshake
  echo "Connected to proxy"
) 2>&1
echo ""

echo "=== Test: send minimal data and check if proxy responds ==="
# Use uclient-fetch through the proxy? No, uclient-fetch doesn't support proxies.
# Let's just test the connection with lua
lua -e '
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
s:connect("127.0.0.1", 8443)
-- Send minimal TLS ClientHello with SNI
local hello = string.char(
  0x16, 0x03, 0x01, 0x00, 0x68, -- record: handshake, TLS 1.0, length=104
  0x01, 0x00, 0x00, 0x64,       -- handshake: ClientHello, length=100
  0x03, 0x03,                   -- version: TLS 1.2
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, -- random (zeros)
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00,                       -- session id length
  0x00, 0x02,                   -- cipher suites length
  0x00, 0x2F,                   -- TLS_RSA_AES_128_CBC_SHA
  0x01,                         -- compression methods length
  0x00,                         -- null compression
  0x00, 0x1B,                   -- extensions length (27)
  0x00, 0x00, 0x00, 0x10,       -- SNI extension (type=0, length=16)
    0x00, 0x0E,                 -- SNI list length (14)
    0x00,                       -- name type: host_name
    0x00, 0x0B,                 -- name length (11)
    -- cdn.shabakaty.com
    0x63, 0x64, 0x6E, 0x2E, 0x73, 0x68, 0x61, 0x62, 0x61, 0x6B, 0x61,
    0x74, 0x79, 0x2E, 0x63, 0x6F, 0x6D
)
-- Actually the name is "cdn.shabakaty.com" which is 17 chars, let me fix
-- For now, just test basic connectivity
s:send("TEST")
local resp, err = s:recv(1024, 2)
print("Response:", resp and #resp, err)
s:close()
' 2>&1