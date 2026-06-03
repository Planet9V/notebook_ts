import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    print("Launching browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        print("Navigating to http://localhost:4200...")
        await page.goto("http://localhost:4200")
        await page.wait_for_timeout(3000)
        
        # Click "Register New Account"
        print("Clicking Register New Account...")
        await page.locator("text=Register New Account").click()
        await page.wait_for_timeout(2000)
        
        # Dump page HTML surrounding the form
        html = await page.content()
        print("Form HTML:")
        # Look for form elements
        form_elements = await page.locator("form").inner_html()
        print(form_elements)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
