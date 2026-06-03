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
        
        email = f"audit_{os.urandom(4).hex()}@test.com"
        print(f"Registering user with email: {email}")
        
        print("Navigating to http://localhost:4200...")
        await page.goto("http://localhost:4200")
        await page.wait_for_timeout(3000)
        
        print("Clicking Register New Account...")
        await page.locator("text=Register New Account").click()
        await page.wait_for_timeout(2000)
        
        print("Filling form...")
        await page.locator("input#firstName").fill("Audit")
        await page.locator("input#lastName").fill("User")
        await page.locator("input[name='email']").fill(email)
        await page.locator("input[name='confirmEmail']").fill(email)
        await page.locator("input#SecurityAnswer1").fill("test")
        await page.locator("input#SecurityQuestion2").fill("What is testing?")
        await page.locator("input#SecurityAnswer2").fill("test")
        
        print("Submitting registration...")
        await page.locator("button[type='submit']").click()
        
        print("Waiting for page update...")
        await page.wait_for_timeout(4000)
        await page.screenshot(path=os.path.join(brain_dir, "cset_after_register.png"))
        print("Took cset_after_register.png")
        
        # Check current URL and page content
        print(f"Current URL: {page.url}")
        text = await page.evaluate("() => document.body.innerText")
        print("--- AFTER REGISTER INNER TEXT ---")
        print(text[:1000])
        print("---------------------------------")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
