import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 375, 'height': 812})
        artifact_dir = r"C:\Users\secon\.gemini\antigravity\brain\7f570170-2f51-4cd9-af18-c4e9fec8f906"
        
        # Home Page Navbar Test
        await page.goto('http://127.0.0.1:5000')
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{artifact_dir}/mobile_home_header.png")
        
        # Show Details Page Test
        await page.goto('http://127.0.0.1:5000/show?url=https://www.fasel-hd.cam/%d9%85%d8%b3%d9%84%d8%b3%d9%84%d8%a7%d8%aa/from')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{artifact_dir}/mobile_show_page.png")
        
        # Watch Page Test
        await page.goto('http://127.0.0.1:5000/watch?url=https://www.fasel-hd.cam/%d9%85%d8%b3%d9%84%d8%b3%d9%84%d8%a7%d8%aa/from&title=From')
        await page.wait_for_timeout(3000)
        await page.screenshot(path=f"{artifact_dir}/mobile_watch_page.png")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
