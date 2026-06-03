import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        
        # Capture console messages
        pg.on('console', lambda msg: print(f"JS CONSOLE [{msg.type}]: {msg.text}"))
        pg.on('pageerror', lambda err: print(f"JS ERROR: {err}"))
        
        print("Navigating...")
        await pg.goto('http://127.0.0.1:5000/')
        
        # Wait a few seconds to let JS run
        await asyncio.sleep(5)
        
        await b.close()

asyncio.run(main())
