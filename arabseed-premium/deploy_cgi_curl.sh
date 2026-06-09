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

-- Install curl to /tmp if not already there (first run)
local curl_bin = "/tmp/usr/bin/curl"
local installed_flag = "/tmp/.curl_installed"

local f = io.open(installed_flag, "r")
if not f then
  os.execute("opkg install -d ram --force-space curl >/dev/null 2>&1")
  local h = io.open(installed_flag, "w")
  if h then h:close() end
end

-- Build curl command with headers from environment
local ua = os.getenv("HTTP_USER_AGENT") or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
local ref = os.getenv("HTTP_REFERER") or "https://cinemana.shabakaty.com/"
local accept = os.getenv("HTTP_ACCEPT") or "*/*"
local client_range = os.getenv("HTTP_RANGE") or range_hdr

local cmd = "LD_LIBRARY_PATH=/tmp/usr/lib " .. curl_bin .. " -s -w '\\n__STATUS__:%{http_code}\\n__CT__:%{content_type}\\n__CL__:%{size_download}\\n__CR__:%{http_code}\\n'"
cmd = cmd .. " -H 'User-Agent: " .. ua .. "'"
cmd = cmd .. " -H 'Referer: " .. ref .. "'"
cmd = cmd .. " -H 'Accept: " .. accept .. "'"
if client_range and client_range ~= "" then
  cmd = cmd .. " -H 'Range: " .. client_range .. "'"
end
cmd = cmd .. " --connect-timeout 20 '" .. url .. "'"

local f = io.popen(cmd)
local output = f:read("*all")
f:close()

-- Parse the status line at the end
local status_code = "200"
local content_type = ""
local content_length = ""

local s_mark = output:find("__STATUS__:")
if s_mark then
  local e = output:find("\n", s_mark)
  if e then
    status_code = output:sub(s_mark + 10, e - 1)
  end
  -- Get content-type
  local ct = output:find("__CT__:", e or 1)
  if ct then
    local ce = output:find("\n", ct)
    if ce then content_type = output:sub(ct + 7, ce - 1) end
  end
  -- Strip the debug lines from body
  output = output:sub(1, (s_mark or #output) - 1)
  -- Remove trailing newline that curl adds
  output = output:gsub("\n$", "")
end

-- Output headers
if status_code ~= "200" then
  io.write("Status: " .. status_code .. "\r\n")
end
if content_type and content_type ~= "" then
  io.write("Content-Type: " .. content_type .. "\r\n")
else
  io.write("Content-Type: text/plain\r\n")
end
io.write("Access-Control-Allow-Origin: *\r\n")
io.write("Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n")
io.write("\r\n")
io.write(output)