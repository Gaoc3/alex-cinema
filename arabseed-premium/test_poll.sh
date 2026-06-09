cat > /tmp/test_poll.lua << 'LUAEOF'
local nixio = require("nixio")
local s = nixio.socket("inet", "stream")
print("socket:", s)
print("testing poll API...")

-- Test 1: poll with single socket table and timeout
local ok, err = pcall(nixio.poll, {s}, 100)
print("Test 1 (poll({s}, 100)):", ok, err)

-- Test 2: poll with empty table and timeout
local ok, err = pcall(nixio.poll, {}, 100)
print("Test 2 (poll({}, 100)):", ok, err)

-- Test 3: try poll_flags
local ok, err = pcall(nixio.poll_flags, "in")
print("poll_flags('in'):", ok, err)

-- Test 4: try poll_flags
local ok, err = pcall(nixio.poll_flags, "out")
print("poll_flags('out'):", ok, err)

-- Test 5: try poll_flags
local ok, err = pcall(nixio.poll_flags, "err")
print("poll_flags('err'):", ok, err)

-- Test 6: try poll_flags
local ok, err = pcall(nixio.poll_flags, "hup")
print("poll_flags('hup'):", ok, err)

-- Test 7: try poll_flags
local ok, err = pcall(nixio.poll_flags, "nval")
print("poll_flags('nval'):", ok, err)
LUAEOF
lua /tmp/test_poll.lua 2>&1