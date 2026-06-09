cd /tmp
rm -f data.tar.gz control.tar.gz debian-binary
for f in curl_8.6.0-1_mips_24kc.ipk libcurl4_8.6.0-1_mips_24kc.ipk libnghttp2-14_1.44.0-1_mips_24kc.ipk libmbedtls12_2.28.8-1_mips_24kc.ipk; do
  tar -xzf "$f" 2>/dev/null
  if [ -f data.tar.gz ]; then
    tar -xzf data.tar.gz -C /tmp 2>/dev/null
    rm -f data.tar.gz control.tar.gz debian-binary
    echo "$f OK"
  fi
done
echo "---"
ls -la /tmp/usr/bin/curl 2>&1
echo "---"
ls -la /tmp/usr/lib/*.so* 2>&1
ldd /tmp/usr/bin/curl 2>&1 || echo "ldd not available"