import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACTS_DIR = r"C:\Users\secon\.gemini\antigravity\brain\1d65666f-4f3a-4ffe-b043-60bcad311dc4"

# We will pass a test url to show.html. We can construct a local url if app.py is running.
# Let's run this script while app.py is running.
async def run_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        viewports = [
            {"name": "desktop", "width": 1920, "height": 1080},
            {"name": "tablet", "width": 820, "height": 1180},
            {"name": "mobile", "width": 390, "height": 844}
        ]
        
        long_title = "مسلسل المليونير السري ذو الاسم الطويل جداً والذي يحتوي على كلمات كثيرة جداً لاختبار التمرير والتفاف النص بشكل سليم وعدم خروج النص من الإطار"
        long_story = "هذه قصة طويلة جداً... " * 30
        
        url = f"http://127.0.0.1:5000/show?url=test&poster=test&title={long_title}&rating=9.9&quality=4K&type=Series&story={long_story}"

        for vp in viewports:
            print(f"Testing {vp['name']} viewport...")
            context = await browser.new_context(viewport={'width': vp['width'], 'height': vp['height']})
            page = await context.new_page()
            
            try:
                await page.goto(url)
                await page.wait_for_selector("#modal-title-text", timeout=10000)
                
                # We want to mock some seasons and episodes
                await page.evaluate("""() => {
                    const seasonsGrid = document.getElementById('modal-seasons-grid');
                    for(let i=1; i<=15; i++){
                        seasonsGrid.innerHTML += `<button class="season-btn ${i===1?'active':''}">الموسم ${i}</button>`;
                    }
                    document.getElementById('modal-seasons-section').style.display = 'block';

                    const episodesGrid = document.getElementById('modal-episodes-grid');
                    for(let i=1; i<=30; i++){
                        episodesGrid.innerHTML += `<div class="episode-btn">الحلقة ${i}</div>`;
                    }
                    document.getElementById('modal-episodes-section').style.display = 'block';
                    
                    const serversList = document.getElementById('modal-servers-list');
                    for(let i=1; i<=8; i++){
                        serversList.innerHTML += `<button class="server-item-btn"><i class="fa-solid fa-server"></i> سيرفر ${i}</button>`;
                    }
                    document.getElementById('modal-servers-section').style.display = 'block';
                    
                    // Inject long story
                    document.getElementById('modal-story-text').innerText = '""" + long_story.replace("'", "\\'") + """';
                }""")
                
                await asyncio.sleep(2)
                
                screenshot_path = os.path.join(ARTIFACTS_DIR, f"show_qa_{vp['name']}.png")
                await page.screenshot(path=screenshot_path, full_page=True)
                print(f"Screenshot saved to {screenshot_path}")
                
                # Check for horizontal scroll bar on body (which means clipping/overflow issues)
                body_scroll_width = await page.evaluate("document.body.scrollWidth")
                window_inner_width = await page.evaluate("window.innerWidth")
                if body_scroll_width > window_inner_width:
                    print(f"WARNING: Horizontal scroll detected on {vp['name']}! scrollWidth={body_scroll_width}, innerWidth={window_inner_width}")
                else:
                    print(f"SUCCESS: No horizontal overflow on {vp['name']}.")
                    
            except Exception as e:
                print(f"Error testing {vp['name']}: {e}")
            
            await context.close()
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
