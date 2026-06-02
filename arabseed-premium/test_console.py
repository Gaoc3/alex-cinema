import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        pg.on('console', lambda msg: print('JS CONSOLE:', msg.text))
        pg.on('pageerror', lambda err: print('JS ERROR:', err))
        print("Navigating...")
        await pg.goto('http://127.0.0.1:5000/')
        try:
            await pg.wait_for_selector('.movie-card', timeout=15000)
            print('Cards found!')
        except Exception as e:
            print("Timeout!", e)
        await b.close()

asyncio.run(main())
