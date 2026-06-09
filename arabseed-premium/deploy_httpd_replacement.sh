# 1. Stop httpd, save the original rc.local
/etc/init.d/uhttpd stop
/etc/init.d/uhttpd disable

# 2. Write the universal Lua server
cat > /usr/bin/universal-server.lua << 'LUAEOF'
#!/usr/bin/lua
-- Universal TCP server for port 80
-- Handles: API (via uclient-fetch) and TCP tunnel (for CDN)
-- Serves on port 80, receiveing traffic from serveo mtskycinemana tunnel

local nixio = require("nixio")
local poll = nixio.poll
local POLLIN = 1
local POLLOUT = 4
local POLLERR = 8
local POLLHUP = 16
local POLLNVAL = 32

-- Known CDN domains and their target mappings
local CDN_MAP = {
  ["cdn.shabakaty.com"] = { host = "cdn.shabakaty.com", port = 443 },
  ["cndw2.shabakaty.com"] = { host = "cndw2.shabakaty.com", port = 443 },
  ["cnth2.shabakaty.com"] = { host = "cnth2.shabakaty.com", port = 443 },
  ["cinemana.shabakaty.com"] = { host = "cinemana.shabakaty.com", port = 443 },
}

-- Resolve hostname to IP
local function resolve(hostname)
  local ok, addrs = pcall(nixio.getaddrinfo, hostname, "inet", 0)
  if ok and addrs and #addrs > 0 then
    for _, addr in ipairs(addrs) do
      if addr and addr.address then
        return addr.address
      end
    end
  end
  return hostname
end

-- Forward data between two sockets (assumes blocking mode)
local function forward(src, dst)
  local buf_size = 16384
  local total = 0
  while true do
    local events = poll({src}, {}, {}, 30000)
    if not events or #events == 0 then break end
    local ev = events[1]
    if ev.events & (POLLERR | POLLHUP | POLLNVAL) ~= 0 then
      break
    end
    if ev.events & POLLIN ~= 0 then
      local data, err = src:recv(buf_size)
      if not data or #data == 0 then break end
      local sent, err2 = dst:send(data)
      if not sent then break end
      total = total + sent
    end
  end
  return total
end

-- Handle HTTP CONNECT tunnel (for CDN TLS passthrough)
local function handle_connect(client, host, port)
  -- Connect to target host (raw TCP)
  local target = nixio.socket("inet", "stream")
  if not target then
    client:send("HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n")
    client:close()
    return
  end

  local ip = resolve(host)
  local ok, err = target:connect(ip, port)
  if not ok then
    client:send("HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n")
    client:close()
    return
  end

  -- Send 200 Connection Established
  client:send("HTTP/1.1 200 OK\r\n\r\n")

  -- Bidirectional forwarding
  local pid = nixio.fork()
  if pid == 0 then
    -- Child: client -> CDN
    forward(client, target)
    target:shutdown(1)
    target:close()
    os.exit(0)
  end

  -- Parent: CDN -> client
  forward(target, client)
  client:shutdown(1)
  nixio.wait(pid)
  client:close()
  target:close()
end

-- Handle API request (GET with url param)
local function handle_api(client, query_string, headers)
  -- Extract url parameter
  local url = ""
  if query_string then
    local _, _, u = query_string:find("url=([^&]+)")
    if u then
      -- URL-decode
      url = u:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
      url = url:gsub("+", " ")
    end
  end

  if not url or url == "" then
    client:send("HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nERROR: missing url\r\n")
    client:close()
    return
  end

  -- Check partial url for host (relative urls)
  local full_url = url
  if not url:match("^https?://") then
    full_url = "https://cinemana.shabakaty.com" .. url
  end

  -- Build uclient-fetch command
  local cmd = 'uclient-fetch -q -O- -T 15 -U "Mozilla/5.0 (X11; Linux x86_64)"'
  
  -- Forward some headers
  if headers["range"] then
    cmd = cmd .. ' --header=Range:' .. headers["range"]
  end
  if headers["accept"] then
    cmd = cmd .. ' --header=Accept:' .. headers["accept"]
  end
  if headers["referer"] or not headers["referer"] then
    local ref = headers["referer"] or "https://cinemana.shabakaty.com/"
    cmd = cmd .. ' --header=Referer:' .. ref
  end
  if headers["user-agent"] then
    cmd = cmd .. ' --header=User-Agent:' .. headers["user-agent"]
  end

  cmd = cmd .. " " .. nixio.quote(full_url)

  -- Execute and return (NOTE: --header may be ignored by uclient-fetch)
  -- For API calls (cinemana.shabakaty.com), uclient-fetch works without custom headers
  -- For CDN calls, this will attempt with headers but may fail
  -- In that case, the client should reconnect with CONNECT method for tunnel
  
  local f = io.popen(cmd, "r")
  if not f then
    client:send("HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\nERROR: fetch failed\r\n")
    client:close()
    return
  end

  -- Read first chunk to determine content type
  local first = f:read(4096)
  if not first or first == "" then
    f:close()
    client:send("HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\nERROR: empty response\r\n")
    client:close()
    return
  end

  local response = first
  local chunk = f:read(16384)
  while chunk do
    response = response .. chunk
    chunk = f:read(16384)
  end
  f:close()

  client:send("HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Expose-Headers: *\r\nCache-Control: no-cache\r\nContent-Length: " .. #response .. "\r\n\r\n")
  client:send(response)
  client:close()
end

-- Parse HTTP request from client
local function parse_http_request(data)
  local method, path, version = data:match("^(%S+) (%S+) HTTP/(%S+)\r\n")
  if not method then
    method, path, version = data:match("^(%S+) (%S+) HTTP/(%S+)\n")
  end
  if not method then return nil end
  
  local headers = {}
  for key, val in data:gmatch("\r\n([%w%-]+): ([^\r\n]+)") do
    headers[key:lower()] = val
  end
  
  return {
    method = method,
    path = path,
    version = version,
    headers = headers,
  }
end

-- Main handler
local function handle_client(client)
  -- Read first request (we need at least the HTTP request line)
  local first_line, rest
  local data = client:recv(8192)
  if not data or #data == 0 then
    client:close()
    return
  end

  local req = parse_http_request(data)
  if not req then
    client:send("HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nBad Request\r\n")
    client:close()
    return
  end

  -- Handle CORS preflight
  if req.method == "OPTIONS" then
    local origin = req.headers["origin"] or "*"
    client:send("HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: " .. origin .. "\r\nAccess-Control-Allow-Methods: GET, POST, CONNECT, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nAccess-Control-Max-Age: 86400\r\nContent-Length: 0\r\n\r\n")
    client:close()
    return
  end

  -- Handle CONNECT (TCP tunnel for CDN)
  if req.method == "CONNECT" then
    local host, port = req.path:match("^([^:]+):(%d+)$")
    if host and port then
      handle_connect(client, host, tonumber(port))
    else
      client:send("HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n")
      client:close()
    end
    return
  end

  -- Handle GET/POST (API proxy)
  if req.method == "GET" or req.method == "POST" then
    local _, _, path, qs = data:find("^%S+ (/[^?]*)%??(.*) HTTP/")
    if not path then
      _, _, path = data:find("^%S+ (/[^?]*) HTTP/")
      qs = ""
    end
    
    -- API endpoint
    if path:match("/cgi%-bin/") then
      handle_api(client, qs, req.headers)
    else
      client:send("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nNot Found\r\n")
      client:close()
    end
    return
  end

  client:send("HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\n\r\n")
  client:close()
end

-- Main server loop
local function main()
  local port = tonumber(arg[1]) or 80
  local bind_addr = arg[2] or "127.0.0.1"
  
  local server = nixio.socket("inet", "stream")
  if not server then
    return 1
  end
  
  server:setopt("reuseaddr", 1)
  local ok, err = server:bind(bind_addr, port)
  if not ok then
    server:close()
    return 1
  end
  
  server:listen(20)
  
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
        -- Reap dead children
        repeat
          local wpid, status = nixio.wait(-1, nixio.wait_flags("nohang"))
        until not wpid or wpid == 0
      end
    else
      nixio.nanosleep(0.1)
    end
  end
  
  server:close()
  return 0
end

local rc = main()
os.exit(rc)
LUAEOF

chmod +x /usr/bin/universal-server.lua

# 3. Start the Lua server on port 80
killall universal-server.lua uhttpd 2>/dev/null
sleep 1
lua /usr/bin/universal-server.lua 80 127.0.0.1 &
sleep 2

echo "=== Server status ==="
netstat -tlnp 2>/dev/null | grep :80
echo ""
echo "=== Test API ==="
uclient-fetch -q -O- --timeout=10 'http://127.0.0.1/cgi-bin/api?url=https%3A%2F%2Fcinemana.shabakaty.com%2F' 2>/dev/null | head -3
echo ""
echo "=== Test tunnel CONNECT ==="
# Just test if the server accepts the connection
echo -e "CONNECT cdn.shabakaty.com:443 HTTP/1.1\r\nHost: cdn.shabakaty.com\r\n\r\n" | nc 127.0.0.1 80 2>&1 | head -3