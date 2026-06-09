# Write the SNI proxy Lua script
cat > /usr/bin/sni-proxy.lua << 'LUAEOF'
#!/usr/bin/lua
-- SNI-based TCP proxy for shabakaty CDNs
-- Listens on a port, reads TLS ClientHello, extracts SNI, forwards to target

local nixio = require("nixio")
local socket = nixio.socket
local poll = nixio.poll
local POLLIN = nixio.poll_flags("in")
local POLLOUT = nixio.poll_flags("out")
local POLLERR = nixio.poll_flags("err")
local POLLHUP = nixio.poll_flags("hup")
local POLLNVAL = nixio.poll_flags("nval")

-- Parse TLS ClientHello to extract SNI
-- Returns the server name or nil
local function parse_sni(data)
  if not data or #data < 5 then return nil end
  -- Check if it's TLS handshake
  local content_type = data:byte(1)
  if content_type ~= 0x16 then return nil end  -- Not TLS Handshake
  
  -- Skip past record header (5 bytes) and handshake header (4 bytes)
  -- Record: type(1) + version(2) + length(2) = 5
  -- Handshake: type(1) + length(3) = 4
  local pos = 5 + 4
  if #data <= pos then return nil end
  
  -- Skip client version (2) and random (32)
  pos = pos + 2 + 32
  if #data <= pos then return nil end
  
  -- Skip session ID (1 byte length + session ID)
  local sid_len = data:byte(pos)
  pos = pos + 1 + sid_len
  if #data <= pos then return nil end
  
  -- Skip cipher suites (2 bytes length + cipher suites)
  local cs_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2 + cs_len
  if #data <= pos then return nil end
  
  -- Skip compression methods (1 byte length + methods)
  local cm_len = data:byte(pos)
  pos = pos + 1 + cm_len
  if #data <= pos then return nil end
  
  -- Extensions (2 bytes length)
  if #data < pos + 2 then return nil end
  local ext_len = data:byte(pos) * 256 + data:byte(pos + 1)
  pos = pos + 2
  local ext_end = pos + ext_len
  if ext_end > #data then ext_end = #data end
  
  -- Parse extensions
  while pos + 4 <= ext_end do
    local ext_type = data:byte(pos) * 256 + data:byte(pos + 1)
    local ext_data_len = data:byte(pos + 2) * 256 + data:byte(pos + 3)
    pos = pos + 4
    if ext_end < pos + ext_data_len then break end
    
    if ext_type == 0 then  -- Server Name Indication (SNI)
      -- Server name list (2 bytes length)
      local sni_pos = pos + 2
      while sni_pos + 3 < pos + ext_data_len do
        local name_type = data:byte(sni_pos)
        if name_type == 0 then  -- host_name
          local name_len = data:byte(sni_pos + 1) * 256 + data:byte(sni_pos + 2)
          local name = data:sub(sni_pos + 3, sni_pos + 3 + name_len - 1)
          return name
        end
        local entry_len = data:byte(sni_pos + 1) * 256 + data:byte(sni_pos + 2)
        sni_pos = sni_pos + 3 + entry_len
      end
    end
    pos = pos + ext_data_len
  end
  
  return nil
end

-- Resolve hostname to IP
local function resolve(hostname)
  local ok, addrs = pcall(nixio.getaddrinfo, hostname, "inet", 443)
  if ok and addrs and #addrs > 0 then
    for _, addr in ipairs(addrs) do
      if addr and type(addr) == "table" and addr.addr then
        return addr.addr
      end
    end
  end
  -- Fallback: try without port
  local ok2, addrs2 = pcall(nixio.getaddrinfo, hostname, "inet", 0)
  if ok2 and addrs2 and #addrs2 > 0 then
    for _, addr in ipairs(addrs2) do
      if addr and type(addr) == "table" and addr.addr then
        return addr.addr
      end
    end
  end
  return nil
end

-- Forward data between two sockets using poll
local function forward_data(src, dst, timeout)
  local buf_size = 16384
  local total = 0
  local deadline = nixio.gettimeofday() + timeout
  
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then break end
    
    local events = poll({src}, {src}, {}, (deadline - now) * 1000)
    if not events or #events == 0 then break end
    
    for _, ev in ipairs(events) do
      if ev.events & (POLLERR | POLLHUP | POLLNVAL) ~= 0 then
        return total
      end
      if ev.events & POLLIN ~= 0 then
        local data, err = src:recv(buf_size)
        if not data or #data == 0 then
          return total
        end
        local sent, err = dst:send(data)
        if not sent then return total end
        total = total + sent
      end
    end
  end
  return total
end

-- Non-blocking connect
local function nb_connect(sock, ip, port, timeout)
  sock:setblocking(false)
  local ok, err = sock:connect(ip, port)
  if ok then
    sock:setblocking(true)
    return true
  end
  if err ~= "in_progress" and err ~= "already" then
    sock:setblocking(true)
    return false, err
  end
  
  -- Wait for connection to complete
  local deadline = nixio.gettimeofday() + timeout
  while true do
    local now = nixio.gettimeofday()
    if now >= deadline then
      sock:setblocking(true)
      return false, "timeout"
    end
    local events = poll({}, {sock}, {}, (deadline - now) * 1000)
    if events and #events > 0 then
      for _, ev in ipairs(events) do
        if ev.events & (POLLERR | POLLHUP) ~= 0 then
          sock:setblocking(true)
          return false, "connection_failed"
        end
        if ev.events & POLLOUT ~= 0 then
          sock:setblocking(true)
          return true
        end
      end
    end
  end
  sock:setblocking(true)
  return false, "unknown"
end

-- Main proxy handler
local function handle_client(client)
  -- Read first 4096 bytes for TLS ClientHello
  local data, err = client:recv(4096)
  if not data or #data == 0 then
    client:close()
    return
  end
  
  -- Parse SNI
  local sni = parse_sni(data)
  if not sni then
    -- Not TLS or no SNI; try plain HTTP
    -- For plain HTTP, check Host header
    local _, _, host = data:find("Host: ([^\r\n]+)", 1)
    if host then
      sni = host:gsub(":%d+$", "")  -- Remove port
    end
  end
  
  if not sni then
    client:close()
    return
  end
  
  -- Resolve the target
  local ip = resolve(sni)
  if not ip then
    client:close()
    return
  end
  
  -- Connect to target
  local target = socket("inet", "stream")
  if not target then
    client:close()
    return
  end
  
  local ok, err = nb_connect(target, ip, 443, 10)
  if not ok then
    target:close()
    client:close()
    return
  end
  
  -- Send the buffered data
  target:send(data)
  
  -- Bidirectional forwarding (use two processes with fork)
  local pid = nixio.fork()
  if pid == 0 then
    -- Child: forward client -> target
    forward_data(client, target, 300)
    target:shutdown(1)  -- SHUT_WR
    target:close()
    os.exit(0)
  end
  
  -- Parent: forward target -> client
  forward_data(target, client, 300)
  client:shutdown(1)
  -- Wait for child to finish
  nixio.wait(pid)
  client:close()
  target:close()
end

-- Main server
local function main()
  local port = tonumber(arg[1]) or 8443
  local bind_addr = arg[2] or "127.0.0.1"
  
  local server = socket("inet", "stream")
  if not server then
    return
  end
  
  server:setopt("reuseaddr", 1)
  local ok, err = server:bind(bind_addr, port)
  if not ok then
    server:close()
    return
  end
  
  server:listen(20)
  
  -- Accept loop
  while true do
    local client, err = server:accept()
    if client then
      local pid = nixio.fork()
      if pid == 0 then
        -- Child: handle this connection
        server:close()
        handle_client(client)
        os.exit(0)
      else
        -- Parent: close client, continue accepting
        client:close()
        -- Reap children without blocking
        repeat
          local wpid, status = nixio.wait(-1, nixio.wait_flags("nohang"))
        until not wpid or wpid == 0
      end
    else
      nixio.nanosleep(0.1)
    end
  end
  
  server:close()
end

main()
LUAEOF
chmod +x /usr/bin/sni-proxy.lua

# Test the script starts
echo "=== Starting sni-proxy test ==="
lua /usr/bin/sni-proxy.lua 18443 &
sleep 2
# Check it's running
ps | grep sni-proxy | grep -v grep
echo "=== Started ==="