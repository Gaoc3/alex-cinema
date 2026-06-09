echo '=== Lua FFI check ==='
lua -e '
local ok, ffi = pcall(require, "ffi")
print("ffi:", ok)
local ok2, alien = pcall(require, "alien")
print("alien:", ok2)
' 2>&1

echo ''
echo '=== Lua version ==='
lua -v 2>&1
which lua
echo ''
echo '=== Check if luajit exists ==='
which luajit 2>&1
echo ''
echo '=== Check liblua ==='
ls -la /usr/lib/liblua* 2>/dev/null
echo ''
echo '=== opkg packages for lua ==='
ls /usr/lib/opkg/info/lua* 2>/dev/null