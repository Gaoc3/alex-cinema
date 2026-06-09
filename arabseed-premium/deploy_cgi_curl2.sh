#!/usr/bin/lua

local function url_decode(str)
  return str:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
end

local function sh_esc(s)
  return "'" .. s:gsub("'", "'\\''") .. "'"
end

local q = os.getenv("QUERY_STRING") or ""
local url_param = ""
local range_param = ""
local client_range = ""

for part in q:gmatch("[^&]+") do
  local k, v = part:match("([^=]+)=(.+)")
  if k == "url" then url_param = v
  elseif k == "range" then range_param = v end
end

if not url_param or url_param == "" then
  io.write("Content-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\nERROR: missing url")
  return
end

local url = url_decode(url_param)

-- Install curl to /tmp if first run
local curl_bin = "/tmp/usr/bin/curl"
local f = io.open("/tmp/.curl_installed", "r")
if not f then
  os.execute("opkg install -d ram --force-space curl >/dev/null 2>&1")
  local h = io.open("/tmp/.curl_installed", "w")
  if h then h:close() end
end

-- Get HTTP headers from CGI environment
local ua = os.getenv("HTTP_USER_AGENT") or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
local ref = os.getenv("HTTP_REFERER") or "https://cinemana.shabakaty.com/"
local accept = os.getenv("HTTP_ACCEPT") or "*/*"
local range_env = os.getenv("HTTP_RANGE")
if range_env and range_env ~= "" then client_range = range_env end
if range_param and range_param ~= "" then client_range = range_param end

-- Build a temp shell script to avoid escaping issues
local script_path = "/tmp/.curl_cgi." .. tostring(math.random(10000, 99999)) .. ".sh"
local sf = io.open(script_path, "w")
sf:write("#!/bin/sh\n")
sf:write("LD_LIBRARY_PATH=/tmp/usr/lib\n")
sf:write("export LD_LIBRARY_PATH\n")
sf:write(curl_bin .. " -s -w '\\n__STATUS__:%{http_code}\\n__CT__:%{content_type}\\n'")
sf:write(" -H " .. sh_esc("User-Agent: " .. ua))
sf:write(" -H " .. sh_esc("Referer: " .. ref))
sf:write(" -H " .. sh_esc("Accept: " .. accept))
if client_range and client_range ~= "" then
  sf:write(" -H " .. sh_esc("Range: " .. client_range))
end
sf:write(" --connect-timeout 25 " .. sh_esc(url))
sf:write("\n")
sf:close()
os.execute("chmod +x " .. script_path)

local f = io.popen(script_path .. " 2>/dev/null")
local output = f:read("*all")
f:close()
os.execute("rm -f " .. script_path .. " 2>/dev/null")

-- Parse curl output for status/content-type
local status_code = "200"
local content_type = ""
local body_end = #output

local s_mark = output:find("__STATUS__:")
if s_mark then
  local e = output:find("\n", s_mark)
  if e then
    status_code = output:sub(s_mark + 10, e - 1)
    local ct = output:find("__CT__:", e)
    if ct then
      local ce = output:find("\n", ct)
      if ce then content_type = output:sub(ct + 7, ce - 1) end
    end
  end
  body_end = (s_mark or #output) - 1
end

local body = output:sub(1, body_end)
body = body:gsub("\n$", "")

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
io.write(body)