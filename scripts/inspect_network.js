const { chromium } = require('playwright-core');

(async () => {
  console.log('Launching Headless Chromium for Network Inspection...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const networkLog = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('tunnel-video') || url.includes('/api/')) {
      networkLog.push({
        url: url.substring(0, 80) + '...',
        method: request.method(),
        headers: request.headers(),
        startTime: Date.now(),
      });
    }
  });

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('tunnel-video') || url.includes('/api/')) {
      const status = response.status();
      const headers = response.headers();
      const size = headers['content-length'] || 'unknown';
      console.log(`[NETWORK RESPONSE] Status: ${status} | Size: ${size} bytes | Content-Type: ${headers['content-type']} | URL: ${url.substring(0, 90)}`);
    }
  });

  console.log('Navigating to https://cinax.live/watch/3117872?title=%D9%85%D8%B3%D8%AA%D8%B9%D9%85%D8%B1%D8%A9 ...');
  await page.goto('https://cinax.live/watch/3117872?title=%D9%85%D8%B3%D8%AA%D8%B9%D9%85%D8%B1%D8%A9', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});

  // Wait 10 seconds to collect video buffering requests
  await new Promise((r) => setTimeout(r, 10000));

  await browser.close();
  console.log('Network Inspection Complete.');
})();
