#!/usr/bin/lua

local function url_decode(str)
  return str:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
end

local q = os.getenv("QUERY_STRING") or ""
local url = ""
local range_hdr = ""

for part in q:gmatch("[^&]+") do
  local k, v = part:match("([^=]+)=(.+)")
  if k == "url" then url = v
  elseif k == "range" then range_hdr = v end
end

if not url or url == "" then
  io.write("Content-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\nERROR: missing url")
  return
end

url = url_decode(url)

-- Use io.popen to call uclient-fetch (supports HTTPS via wolfSSL)
local cmd = 'uclient-fetch -q -O- "' .. url .. '" 2>/dev/null'
local f = io.popen(cmd)
local body = f:read("*all")
local rc = {f:close()}
rc = rc[3] or 0  -- exit code

if rc ~= 0 then
  io.write("Content-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\nERROR: uclient-fetch failed (rc=" .. rc .. ")")
  return
end

io.write("Content-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\n")
io.write(body)