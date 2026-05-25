const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const urls = [
    'https://jackson-north-transit-descriptions.trycloudflare.com/login',
    'http://localhost:8000/login'
  ];
  for (const url of urls) {
    try {
      console.log(`Connecting to ${url}...`);
      const response = await page.goto(url, { timeout: 5000 });
      console.log(`Response status for ${url}:`, response ? response.status() : 'null');
    } catch (e) {
      console.log(`Failed for ${url}:`, e.message);
    }
  }
  await browser.close();
}
run();
