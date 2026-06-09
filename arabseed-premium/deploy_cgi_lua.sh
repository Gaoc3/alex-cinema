# Deploy Lua CGI proxy with nixio sockets
cat > /www/cgi-bin/proxy << 'LUAEOF'
#!/usr/bin/lua
local nixio = require("nixio")

local q = os.getenv("QUERY_STRING") or ""
local url = ""
local range_hdr = ""

for part in q:gmatch("[^&]+") do
  local k, v = part:match("([^=]+)=(.+)")
  if k == "url" then url = v
  elseif k == "range" then range_hdr = v end
end

if not url or url == "" then
  io.write("Content-Type: text/plain\r\n\r\nERROR: missing url")
  return
end

url = url:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)

local proto, hostport, path = url:match("(https?)://([^/]+)(/.*)")
if not proto then
  proto, hostport, path = url:match("(https?)://([^/]+)")
  if proto then path = "/" end
end
if not proto then
  io.write("Content-Type: text/plain\r\n\r\nERROR: invalid url")
  return
end

local host = hostport
local port = (proto == "https") and 443 or 80
local cp = hostport:match(":(%d+)$")
if cp then host = hostport:sub(1, #hostport - #cp - 1); port = tonumber(cp) end

-- Resolve DNS
local ip, err
local ok, addrs = pcall(nixio.getaddrinfo, host, "inet", 0)
if ok and addrs and #addrs > 0 then
  for _, a in ipairs(addrs) do
    if a and a.address then ip = a.address; break end
  end
end
if not ip then ip = host end

-- Connect
local s = nixio.socket("inet", "stream")
if not s then
  io.write("Content-Type: text/plain\r\n\r\nERROR: socket failed")
  return
end
s:setopt("tcp", "nodelay", 1)
local ok, err = s:connect(ip, port)
if not ok then
  s:close()
  io.write("Content-Type: text/plain\r\n\r\nERROR: connect failed: " .. tostring(err))
  return
end

-- Build request
local ua = os.getenv("HTTP_USER_AGENT") or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
local ref = os.getenv("HTTP_REFERER") or "https://cinemana.shabakaty.com/"
local accept = os.getenv("HTTP_ACCEPT") or "*/*"
local client_range = os.getenv("HTTP_RANGE") or range_hdr
if client_range and client_range ~= "" then client_range = "Range: " .. client_range .. "\r\n" else client_range = "" end

local req = "GET " .. path .. " HTTP/1.0\r\n"
  .. "Host: " .. host .. "\r\n"
  .. "User-Agent: " .. ua .. "\r\n"
  .. "Accept: " .. accept .. "\r\n"
  .. "Referer: " .. ref .. "\r\n"
  .. client_range
  .. "Connection: close\r\n\r\n"

s:send(req)

-- Read response
local all = {}
local buf = s:recv(16384)
while buf and #buf > 0 do
  all[#all + 1] = buf
  local poll_ok, events = nixio.poll({{fd = s, events = 1}}, 5000)
  if poll_ok and events and events[1] then
    local rev = events[1].revents
    if rev % 2 >= 1 then
      buf = s:recv(16384)
    else
      break
    end
  else
    break
  end
end
s:close()

local response = table.concat(all)
local hdr_end = response:find("\r\n\r\n")
if not hdr_end then
  io.write("Content-Type: text/plain\r\n\r\nERROR: no response headers")
  return
end

local resp_headers = response:sub(1, hdr_end - 1)
local body = response:sub(hdr_end + 4)

-- Parse status line
local status_line = resp_headers:match("^HTTP/%d%.%d (%d+)")
local status = tonumber(status_line) or 200

local ct = resp_headers:match("Content%-Type: ([^\r\n]+)")
local cl = resp_headers:match("Content%-Length: ([^\r\n]+)")
local cr = resp_headers:match("Content%-Range: ([^\r\n]+)")
local ar = resp_headers:match("Accept%-Ranges: ([^\r\n]+)")

-- This is CGI: first line is CGI status header for lighttpd
if status ~= 200 then
  io.write("Status: " .. status .. "\r\n")
end
io.write("Content-Type: " .. (ct or "application/octet-stream") .. "\r\n")
if cl then io.write("Content-Length: " .. cl .. "\r\n") end
if cr then io.write("Content-Range: " .. cr .. "\r\n") end
if ar then io.write("Accept-Ranges: " .. ar .. "\r\n") end
io.write("Access-Control-Allow-Origin: *\r\n")
io.write("Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n")
io.write("\r\n")

io.write(body)
LUAEOF
chmod +x /www/cgi-bin/proxy
echo "Deployed!"

# Test the new CGI
echo "=== Test 1: local API request ==="
uclient-fetch -q -O- "http://127.0.0.1/cgi-bin/proxy?url=https%3A%2F%2Fcinemana.shabakaty.com%2F" 2>/dev/null | head -5
echo ""
echo "=== Test 2: CGI response status ==="
uclient-fetch -q -S -O- "http://127.0.0.1/cgi-bin/proxy?url=https%3A%2F%2Fcinemana.shabakaty.com%2F" 2>&1 | head -10