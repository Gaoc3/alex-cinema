cat > /tmp/test_sni_real.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
s:connect("127.0.0.1", 8443)

-- Build a simple TLS 1.2 ClientHello with SNI = cinemana.shabakaty.com
local host = "cinemana.shabakaty.com"
local host_len = #host

-- ClientHello body
local hello_body = {}

-- TLS version (0x0303 = TLS 1.2)
hello_body[#hello_body+1] = 0x03
hello_body[#hello_body+1] = 0x03

-- Random (32 bytes)
for i = 1, 32 do hello_body[#hello_body+1] = 0 end

-- Session ID (empty)
hello_body[#hello_body+1] = 0

-- Cipher Suites (2 bytes length + suites)
hello_body[#hello_body+1] = 0x00
hello_body[#hello_body+1] = 0x04 -- length = 4
hello_body[#hello_body+1] = 0x13 -- TLS_AES_256_GCM_SHA384
hello_body[#hello_body+1] = 0x02
hello_body[#hello_body+1] = 0x00 -- TLS_CHACHA20_POLY1305_SHA256
hello_body[#hello_body+1] = 0x2F

-- Compression methods
hello_body[#hello_body+1] = 0x01
hello_body[#hello_body+1] = 0x00

-- Build SNI extension
local sni_entry = {}
sni_entry[#sni_entry+1] = 0x00 -- host_name
sni_entry[#sni_entry+1] = 0x00
sni_entry[#sni_entry+1] = host_len
for i = 1, host_len do
  sni_entry[#sni_entry+1] = string.byte(host, i)
end
local sni_entry_bytes = #sni_entry

-- SNI extension body (1 + 2 + sni_entry)
local sni_body = {}
sni_body[#sni_body+1] = 0x00 -- list type
sni_body[#sni_body+1] = math.floor(sni_entry_bytes / 256)
sni_body[#sni_body+1] = sni_entry_bytes % 256
for _, v in ipairs(sni_entry) do sni_body[#sni_body+1] = v end
local sni_body_len = #sni_body

-- SNI extension (type 0, length)
local sni_ext = {}
sni_ext[#sni_ext+1] = 0x00 -- ext type SNI
sni_ext[#sni_ext+1] = 0x00
sni_ext[#sni_ext+1] = math.floor(sni_body_len / 256)
sni_ext[#sni_ext+1] = sni_body_len % 256
for _, v in ipairs(sni_body) do sni_ext[#sni_ext+1] = v end
local sni_ext_len = #sni_ext

-- Add this one extension
hello_body[#hello_body+1] = math.floor(sni_ext_len / 256)
hello_body[#hello_body+1] = sni_ext_len % 256
for _, v in ipairs(sni_ext) do hello_body[#hello_body+1] = v end

local hello_body_len = #hello_body

-- Handshake header (type 1 = ClientHello)
local hs = {}
hs[#hs+1] = 0x01 -- type ClientHello
hs[#hs+1] = math.floor(hello_body_len / 65536)
hs[#hs+1] = math.floor(hello_body_len / 256) % 256
hs[#hs+1] = hello_body_len % 256
for _, v in ipairs(hello_body) do hs[#hs+1] = v end
local hs_len = #hs

-- Record layer
local record = string.char(0x16, -- Handshake
  0x03, 0x01, -- version TLS 1.0
  math.floor(hs_len / 256), hs_len % 256) -- length
record = record .. string.char(unpack(hs))

print("Sending ClientHello for:", host)
print("Total bytes:", #record)
s:send(record)

-- Try to receive ServerHello
local resp, err = s:recv(4096)
s:close()

if resp and #resp > 0 then
  print("Received", #resp, "bytes")
  print("Byte 1 (type):", string.format("0x%02X", resp:byte(1)))
  if resp:byte(1) == 0x16 then
    print("=> Received TLS Handshake!")
    if resp:byte(6) == 0x02 then
      print("=> ServerHello received! SNI proxy WORKS!")
    elseif resp:byte(6) == 0x0B then
      local cert_len = resp:byte(12) * 256 + resp:byte(13)
      print("=> Certificate message!", cert_len, "bytes")
    elseif resp:byte(6) == 0x0E then
      print("=> ServerHelloDone")
    elseif resp:byte(6) == 0x0C then
      print("=> Server Key Exchange")
    else
      print("=> Handshake type:", string.format("0x%02X", resp:byte(6)))
    end
    -- Print first 50 bytes hex
    local hex = ""
    for i = 1, math.min(#resp, 64) do
      hex = hex .. string.format("%02X ", resp:byte(i))
    end
    print("First bytes:", hex)
  elseif resp:byte(1) == 0x15 then
    print("=> TLS Alert:", string.format("0x%02X %02X", resp:byte(6), resp:byte(7)))
    -- This means the CDN rejected our handshake
  elseif resp:byte(1) == 0x03 then
    print("=> Looks like HTTP response (not TLS)")
    print("Body:", resp:sub(1, 200))
  else
    print("Unknown content type:", string.format("0x%02X", resp:byte(1)))
  end
else
  print("No response:", err or "empty")
end
LUAEOF
lua /tmp/test_sni_real.lua 2>&1