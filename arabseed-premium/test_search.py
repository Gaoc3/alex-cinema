import asyncio
from playwright.async_api import async_playwright
import sys

async def main():
    if len(sys.argv) < 2:
        print("Usage: python test_search.py <URL>")
        sys.exit(1)
        
    url = sys.argv[1]
    
    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print(f"Navigating to {url}...")
        await page.goto(url)
        
        print("Waiting for page to load completely...")
        await page.wait_for_selector(".movie-card", timeout=20000)
        
        print("Typing in the search box...")
        # Focus on the search input and type "Game"
        await page.fill("#search-input", "Game")
        
        print("Waiting for live search dropdown...")
        try:
            # Wait for the live search dropdown to show
            await page.wait_for_selector("#live-search-dropdown", state="visible", timeout=10000)
            
            # Wait for the results to load (loader disappears and results appear)
            await page.wait_for_selector(".live-search-item", timeout=20000)
            
            print("Live search results appeared successfully!")
            
            # Take a screenshot
            await page.screenshot(path="live_search_success.png")
            print("Screenshot saved to live_search_success.png")
            
            # Print the title of the first result
            first_result_title = await page.inner_text(".live-search-item .live-item-title")
            print(f"First result title: {first_result_title}")
            
        except Exception as e:
            print(f"Failed to get live search results: {e}")
            await page.screenshot(path="live_search_failed.png")
            print("Screenshot saved to live_search_failed.png")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
