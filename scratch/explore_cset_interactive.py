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
        await page.goto("http://localhost:4200")
        await page.wait_for_timeout(3000)
        
        # Dump all text content
        text = await page.evaluate("() => document.body.innerText")
        print("--- PAGE INNER TEXT ---")
        print(text[:2000])
        print("-----------------------")
        
        # Dump interactive elements
        buttons = await page.locator("button, a, input[type='button'], input[type='submit']").all()
        print(f"Found {len(buttons)} interactive elements:")
        for i, btn in enumerate(buttons):
            text_content = (await btn.inner_text()).strip()
            id_attr = await btn.get_attribute("id")
            class_attr = await btn.get_attribute("class")
            href_attr = await btn.get_attribute("href")
            print(f"[{i}] text='{text_content}' id='{id_attr}' class='{class_attr}' href='{href_attr}'")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
