import asyncio
from playwright.async_api import async_playwright

async def run():
    print("Launching Chromium in headless mode...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        print("Navigating to http://localhost:8502/notebooks...")
        await page.goto("http://localhost:8502/notebooks")
        await page.wait_for_load_state("networkidle")
        
        # Click on the Tetrel OT card div
        print("Locating and clicking the Tetrel OT card...")
        # Target the card containing "Tetrel OT"
        card = page.locator("div", has_text="Tetrel OT").first
        await card.click()
        
        # Wait for potential navigation or state changes
        print("Waiting for page load...")
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")
        
        print(f"Current URL: {page.url}")
        
        screenshot_path = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/notebook_workspace.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot successfully saved to: {screenshot_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
