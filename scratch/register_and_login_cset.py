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
        
        # Click "Register New Account"
        print("Clicking Register New Account...")
        await page.locator("text=Register New Account").click()
        await page.wait_for_timeout(2000)
        
        # Screenshot the registration form
        await page.screenshot(path=os.path.join(brain_dir, "cset_register.png"))
        print("Took cset_register.png")
        
        # Dump interactive elements on register page
        inputs = await page.locator("input").all()
        print(f"Found {len(inputs)} input elements on registration page:")
        for idx, inp in enumerate(inputs):
            name_attr = await inp.get_attribute("name")
            id_attr = await inp.get_attribute("id")
            type_attr = await inp.get_attribute("type")
            placeholder = await inp.get_attribute("placeholder")
            print(f"[{idx}] name='{name_attr}' id='{id_attr}' type='{type_attr}' placeholder='{placeholder}'")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
