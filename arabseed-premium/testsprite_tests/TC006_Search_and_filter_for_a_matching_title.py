import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(15000)
        page = await context.new_page()
        # -> navigate
        await page.goto("http://localhost:3000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Enter the movie title 'Inception' into the search input (element [8]) to trigger suggestion/result display, then wait for UI to update.
        # text input placeholder="عن ماذا تبحث اليوم؟..."
        elem = page.locator("xpath=/html/body/nav/div/div/div[2]/div/form/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Inception")
        
        # -> Click the 'الأفلام' (Movies) button at index 21 to apply a type filter and observe whether results update.
        # button "الأفلام"
        elem = page.locator("xpath=/html/body/aside/div[3]/div/div/button").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Click the genre filter 'أفلام أكشن' (Action films) at index 24 to apply a genre filter and observe whether search results update.
        # link "أفلام أكشن"
        elem = page.locator("xpath=/html/body/aside/div[3]/div/div/div/a[3]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Open the year filter control by clicking the year select element at index [335] to reveal and choose a year range.
        # "كل السنوات 2020 - 2026 2010 - 2019 2000 ..."
        elem = page.locator("xpath=/html/body/main/div/div[2]/div[2]/div/div/div[3]/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> click
        # "كل التقييمات 8+ IMDb 7+ IMDb 6+ IMDb 5+ ..."
        elem = page.locator("xpath=/html/body/main/div/div[2]/div[2]/div/div/div[2]/select").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Click the 'خيال علمي' (Science Fiction) genre button at index 371 to check whether a matching result appears.
        # button "خيال علمي"
        elem = page.locator("xpath=/html/body/main/div/div[2]/aside/div/div/button[5]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Clear restrictive filters by selecting 'All categories' (click index 367), set year to 'كل السنوات' (select_dropdown index 335), and set rating to 'كل التقييمات' (select_dropdown index 326) to see if any results for 'Inception' appear.
        # button "كل التصنيفات"
        elem = page.locator("xpath=/html/body/main/div/div[2]/aside/div/div/button").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Clear the search input (element [8]) to show all movies, wait for the UI to update, and search the page for the string 'Inception'.
        # text input placeholder="عن ماذا تبحث اليوم؟..."
        elem = page.locator("xpath=/html/body/nav/div/div/div[2]/div/form/input").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("")
        
        # --> Test failed (AST guard fallback)
        raise AssertionError("Test failed during agent run: " + "TEST FAILURE The movie 'Inception' was not found in the catalog despite using the search and filters. Observations: - The page displayed '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0641\u0644\u0627\u0645 \u0645\u0637\u0627\u0628\u0642\u0629' (no matching films) after searching for 'Inception'. - Multiple filters were applied and adjusted (Genre: Action and Sci\u2011Fi; Year: 2010-2019; Rating: 8+ IMDb) and then cleared, but no matching result appeared.")
        await asyncio.sleep(5)
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    