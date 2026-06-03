import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    print("Launching browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        brain_dir = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7"
        os.makedirs(brain_dir, exist_ok=True)
        
        print("Navigating to http://localhost:4200...")
        try:
            await page.goto("http://localhost:4200", timeout=10000)
            await page.wait_for_timeout(3000)
            await page.screenshot(path=os.path.join(brain_dir, "cset_home.png"))
            print("Took cset_home.png")
            
            # Let's inspect page elements
            title = await page.title()
            print(f"Page Title: {title}")
            
            content = await page.content()
            print("First 1000 chars of page HTML:")
            print(content[:1000])
        except Exception as e:
            print(f"Error navigating: {e}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
