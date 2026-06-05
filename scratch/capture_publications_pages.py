import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    print("Launching Chromium in headless mode...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Ensure we capture standard desktop width/height
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        # 1. Publications Dashboard Page
        print("Navigating to http://localhost:8502/publications...")
        await page.goto("http://localhost:8502/publications")
        # Wait for page to initialize and populate elements
        await page.wait_for_timeout(3000)
        await page.wait_for_load_state("networkidle")
        
        dashboard_screenshot_path = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/publications_dashboard.png"
        await page.screenshot(path=dashboard_screenshot_path, full_page=False)
        print(f"Publications Dashboard screenshot saved to: {dashboard_screenshot_path}")
        
        # 2. Publications Settings Page
        print("Navigating to http://localhost:8502/settings/publications...")
        await page.goto("http://localhost:8502/settings/publications")
        await page.wait_for_timeout(3000)
        await page.wait_for_load_state("networkidle")
        
        settings_screenshot_path = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/publications_settings.png"
        await page.screenshot(path=settings_screenshot_path, full_page=False)
        print(f"Publications Settings screenshot saved to: {settings_screenshot_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
