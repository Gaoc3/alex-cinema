#!/usr/bin/lua
-- SNI-based TCP proxy: listens on a port, reads TLS ClientHello,
-- extracts SNI, forwards to the correct CDN.
-- Usage: sni-proxy.lua [port] [bind_addr]

local nixio = require("nixio")

-- CDN hostname to IP mapping (cached)
local dns_cache = {}

local function resolve(name)
  if dns_cache[name] then return dns_cache[name] end
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
  local pos = 5 + 4 -- skip record header + handshake header
  if #data <= pos then return nil end
  pos = pos + 2 + 32 -- skip client version + random
  if #data <= pos then return nil end
  local sid_len = data:byte(pos)
  pos = pos + 1 + sid_len
  if #data <= pos then return nil end
  local cs_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2 + cs_len
  if #data <= pos then return nil end
  local cm_len = data:byte(pos)
  pos = pos + 1 + cm_len
  if #data <= pos then return nil end
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
        local name_type = data:byte(sni_pos)
        if name_type == 0 then
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

local function forward_data(src, dst, timeout_ms)
  local buf = nixio.socket("inet", "stream") -- dummy for poll
  local total = 0
  local deadline = nixio.gettimeofday() + timeout_ms / 1000
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then break end
    local events = nixio.poll({src}, {}, {}, (deadline - now) * 1000)
    if not events or #events == 0 then break end
    local ev = events[1]
    if ev.events & (8 | 16 | 32) ~= 0 then break end -- ERR|HUP|NVAL
    if ev.events & 1 ~= 0 then -- POLLIN
      local data, err = src:recv(16384)
      if not data or #data == 0 then break end
      local sent, err2 = dst:send(data)
      if not sent then break end
      total = total + sent
    end
  end
  return total
end

local function handle_client(client)
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
    forward_data(client, target, 300000)
    target:shutdown(1); target:close()
    os.exit(0)
  end

  forward_data(target, client, 300000)
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
    if pid == 0 then
      server:close()
      handle_client(client)
      os.exit(0)
    else
      client:close()
      repeat local w, s = nixio.wait(-1, 1) until not w or w == 0
    end
  else
    nixio.nanosleep(0.1)
  end
end
server:close()