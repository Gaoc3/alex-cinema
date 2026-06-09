# Test CDN with various User-Agent and spider mode
echo "=== CDN video with Chrome UA ==="
uclient-fetch -q -O- --timeout=10 \
  -U 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \
  'https://cdn.shabakaty.com/vascin24-mp4/665c85ed556f37a0af24c62e/665c85ed556f37a0af24c62e.mp4' 2>&1 | head -10
echo ""

echo "=== CDN video with Android UA ==="
uclient-fetch -q -O- --timeout=10 \
  -U 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36' \
  'https://cdn.shabakaty.com/vascin24-mp4/665c85ed556f37a0af24c62e/665c85ed556f37a0af24c62e.mp4' 2>&1 | head -10
echo ""

echo "=== CDN with non-MP4 path (without trailing path) ==="
uclient-fetch -q -O- --timeout=10 \
  -U 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' \
  'https://cdn.shabakaty.com/' 2>&1 | head -5
echo ""

echo "=== Try different CDN (cndw6 which is the redirect target) ==="
uclient-fetch -q -O- --timeout=10 \
  -U 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' \
  'https://cndw6.shabakaty.com/vascin24-mp4/665c85ed556f37a0af24c62e/665c85ed556f37a0af24c62e.mp4' 2>&1 | head -10
echo ""

echo "=== Try images with various UA ==="
uclient-fetch -q -O- --timeout=10 \
  -U 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' \
  'https://cnth2.shabakaty.com/uploads/posts/2024-05/medium/1715947652_cb06ef77a02b2b92d85ef111fbb1f3f4.webp' 2>&1 | head -5
echo ""

echo "=== Try curl-equivalent using --post-data with different method ==="
echo "(Testing if we can POST to the video CDN)"
uclient-fetch -q -O- --timeout=10 \
  -U 'Mozilla/5.0' \
  --post-data='' \
  'https://cdn.shabakaty.com/vascin24-mp4/665c85ed556f37a0af24c62e/665c85ed556f37a0af24c62e.mp4' 2>&1 | head -5
echo ""

echo "=== Spider mode to check content-type ==="
uclient-fetch -s --timeout=10 \
  -U 'Mozilla/5.0' \
  'https://cdn.shabakaty.com/vascin24-mp4/665c85ed556f37a0af24c62e/665c85ed556f37a0af24c62e.mp4' 2>&1
echo "EXIT: $?"