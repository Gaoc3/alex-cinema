import asyncio
from playwright.async_api import async_playwright
import os

ARTIFACTS_DIR = r"c:\Users\secon\.gemini\antigravity\brain\7f570170-2f51-4cd9-af18-c4e9fec8f906"

async def main():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        print("Navigating to home page...")
        await page.goto("http://127.0.0.1:5000/")
        await page.wait_for_selector(".movie-card", timeout=15000)
        # Scroll down a bit to trigger lazy loads
        await page.evaluate("window.scrollBy(0, 500)")
        await asyncio.sleep(2)
        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "home_page.png"), full_page=True)
        print("Home page screenshot saved.")

        # Click on the first movie card to go to /show
        print("Clicking on first card...")
        await page.click(".movie-card")
        await page.wait_for_selector("#modal-title-text", timeout=15000)
        await asyncio.sleep(3)
        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "show_page.png"), full_page=True)
        try:
            print("Waiting for Quick Play or Episode...")
            # Dump the display style of the button to see what it is
            display_style = await page.evaluate("() => document.getElementById('modal-quick-play-btn')?.style.display")
            print(f"Quick Play display before wait: {display_style}")
            
            # Wait for JS to populate it
            await asyncio.sleep(16) # wait past the 15s timeout
            
            display_style = await page.evaluate("() => document.getElementById('modal-quick-play-btn')?.style.display")
            print(f"Quick Play display after 16s: {display_style}")
            
            # Force click via JS
            await page.evaluate("() => document.getElementById('modal-quick-play-btn')?.click()")
            
        except Exception as e:
            print("Quick play error:", e)
            print("Clicking first episode...")
            await page.evaluate("() => document.querySelector('.episode-btn')?.click()")
        
        await page.wait_for_selector("#player-title, .watch-title", timeout=30000)
        
        # Wait for loader to disappear
        print("Waiting for custom loader to disappear...")
        try:
            await page.wait_for_selector("#player-custom-loader", state="hidden", timeout=75000)
            print("Loader disappeared! Video is ready.")
        except Exception as e:
            print("Loader did not disappear:", e)
        
        await asyncio.sleep(4)
        await page.screenshot(path=os.path.join(ARTIFACTS_DIR, "watch_page.png"), full_page=True)
        print("Watch page screenshot saved.")

        # Verify stream network request
        print("Done.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
