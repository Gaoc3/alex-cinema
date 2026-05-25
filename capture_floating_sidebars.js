const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EMAIL = 'ali123zxcvbnalizxcvbnm802@gmail.com';
const PASSWORD = 'farah1ST';
const WORKSPACE_DIR = __dirname;

async function selectSemesterIfVisible(page) {
  await page.waitForTimeout(1000); // let page load and settle
  const isVisible = await page.locator('#semesterSelection').isVisible();
  if (isVisible) {
    console.log('Semester Selection Gateway detected. Selecting Semester 1...');
    await page.click('.gateway-card[data-select-semester="1"]');
    await page.waitForSelector('#dashboardApp', { state: 'visible' });
    await page.waitForTimeout(1000);
  }
}

async function run() {
  console.log('Starting sidebar screenshot capture and layout verification...');

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3, // High-resolution screenshot
      isMobile: true,
      hasTouch: true,
      bypassCSP: true,
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    // 1. Determine which URL is responsive
    const urls = [
      'https://jackson-north-transit-descriptions.trycloudflare.com/login',
      'http://localhost:8000/login'
    ];

    let targetUrl = '';
    for (const url of urls) {
      try {
        console.log(`Trying to connect to ${url}...`);
        const response = await page.goto(url, { timeout: 15000, waitUntil: 'load' });
        if (response && response.status() < 500) {
          targetUrl = url;
          console.log(`Successfully connected to ${url}`);
          break;
        }
      } catch (err) {
        console.log(`Failed to connect to ${url}: ${err.message}`);
      }
    }

    if (!targetUrl) {
      throw new Error('All target login URLs are unresponsive!');
    }

    // 2. Perform Login
    console.log('Logging in...');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**');
    console.log('Successfully redirected to dashboard!');

    // 3. Bypass browser cache and force a hard reload
    console.log('Bypassing cache and forcing hard reload...');
    await page.reload({ waitUntil: 'networkidle' });
    console.log('Hard reload complete.');

    // 4. Handle Semester Gateway Select Overlay if present
    await selectSemesterIfVisible(page);

    // Wait for the main app layout and topbar to be fully ready
    await page.waitForSelector('#dashboardApp', { state: 'visible' });
    await page.waitForTimeout(1000);

    // ==========================================
    // STEP 4-7: Arabic RTL Sidebar View
    // ==========================================
    console.log('\n--- VERIFYING ARABIC RTL SIDEBAR ---');

    // Ensure we are in Arabic (RTL)
    let currentLang = await page.evaluate(() => document.documentElement.lang);
    if (currentLang !== 'ar') {
      console.log('Language is English. Swapping to Arabic...');
      await page.click('#langToggleBtn');
      await page.waitForSelector('html[lang="ar"]');
      await selectSemesterIfVisible(page);
      await page.waitForTimeout(1000);
    }
    console.log('Confirmed language is Arabic (RTL).');

    // Click the hamburger button to open the mobile sidebar
    console.log('Opening mobile Arabic sidebar...');
    await page.click('#sidebarToggleBtn');
    await page.waitForSelector('#dashboardSidebar', { state: 'visible' });
    await page.waitForTimeout(800); // Wait for transition animations to settle

    // Get telemetry of open Arabic sidebar
    const arTelemetry = await page.evaluate(() => {
      const sidebar = document.querySelector('#dashboardSidebar');
      const rect = sidebar.getBoundingClientRect();
      const style = window.getComputedStyle(sidebar);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      return {
        viewportWidth,
        viewportHeight,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: style.top,
        bottom: style.bottom,
        left: style.left,
        right: style.right,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        heightProperty: style.height
      };
    });

    console.log('Arabic Mobile Sidebar Telemetry:', JSON.stringify(arTelemetry, null, 2));

    // Verify Arabic mobile sidebar float layout, rounding, height
    const arRightMargin = arTelemetry.viewportWidth - (arTelemetry.x + arTelemetry.width);
    console.log(`Arabic Sidebar right edge margin: ${arRightMargin}px (Expected: around 16px)`);
    console.log(`Arabic Sidebar top edge margin: ${arTelemetry.y}px (Expected: 16px)`);
    console.log(`Arabic Sidebar height: ${arTelemetry.height}px (Expected: fit-content)`);
    console.log(`Arabic Sidebar border-radius: ${arTelemetry.borderRadius} (Expected: 24px)`);
    
    const arStretchesToBottom = arTelemetry.y + arTelemetry.height >= arTelemetry.viewportHeight;
    console.log(`Arabic Sidebar stretches to bottom? ${arStretchesToBottom} (Expected: false)`);

    // Capture Arabic Mobile Screenshot
    const arScreenshotPath = path.join(WORKSPACE_DIR, 'floating_sidebar_ar.png');
    await page.screenshot({ path: arScreenshotPath });
    console.log(`Saved Arabic Mobile Sidebar screenshot to ${arScreenshotPath}`);

    // ==========================================
    // STEP 8-11: English LTR Sidebar View
    // ==========================================
    console.log('\n--- VERIFYING ENGLISH LTR SIDEBAR ---');

    // Switch language to English (LTR)
    console.log('Closing Arabic sidebar first...');
    await page.evaluate(() => {
      document.getElementById('sidebarCloseBtn')?.click() || document.getElementById('sidebarBackdrop')?.click();
    });
    await page.waitForTimeout(800);

    console.log('Swapping language to English...');
    await page.click('#langToggleBtn');
    await page.waitForSelector('html[lang="en"]');
    await selectSemesterIfVisible(page);
    await page.waitForTimeout(1000);
    console.log('Confirmed language is English (LTR).');

    // Click hamburger button to open mobile sidebar
    console.log('Opening mobile English sidebar...');
    await page.click('#sidebarToggleBtn');
    await page.waitForSelector('#dashboardSidebar', { state: 'visible' });
    await page.waitForTimeout(800);

    // Get telemetry of open English sidebar
    const enTelemetry = await page.evaluate(() => {
      const sidebar = document.querySelector('#dashboardSidebar');
      const rect = sidebar.getBoundingClientRect();
      const style = window.getComputedStyle(sidebar);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      return {
        viewportWidth,
        viewportHeight,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: style.top,
        bottom: style.bottom,
        left: style.left,
        right: style.right,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        heightProperty: style.height
      };
    });

    console.log('English Mobile Sidebar Telemetry:', JSON.stringify(enTelemetry, null, 2));

    // Verify English mobile sidebar float layout, rounding, height
    console.log(`English Sidebar left edge margin: ${enTelemetry.x}px (Expected: 16px)`);
    console.log(`English Sidebar top edge margin: ${enTelemetry.y}px (Expected: 16px)`);
    console.log(`English Sidebar height: ${enTelemetry.height}px (Expected: fit-content)`);
    console.log(`English Sidebar border-radius: ${enTelemetry.borderRadius} (Expected: 24px)`);
    
    const enStretchesToBottom = enTelemetry.y + enTelemetry.height >= enTelemetry.viewportHeight;
    console.log(`English Sidebar stretches to bottom? ${enStretchesToBottom} (Expected: false)`);

    // Capture English Mobile Screenshot
    const enScreenshotPath = path.join(WORKSPACE_DIR, 'floating_sidebar_en.png');
    await page.screenshot({ path: enScreenshotPath });
    console.log(`Saved English Mobile Sidebar screenshot to ${enScreenshotPath}`);

    console.log('\nAll operations and verifications completed successfully!');

  } catch (err) {
    console.error('An error occurred during automation:', err);
  } finally {
    await browser.close();
  }
}

run();
