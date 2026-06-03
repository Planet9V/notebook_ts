import asyncio
import os
from playwright.async_api import async_playwright

async def run():
    print("Initializing Playwright browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        # Log browser console messages
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: [{msg.type}] {msg.text}"))
        
        # Log network requests
        page.on("request", lambda req: print(f"NETWORK REQ: {req.method} {req.url}"))
        page.on("response", lambda res: print(f"NETWORK RES: {res.status} {res.url}"))
        
        print("Navigating to http://localhost:8502/notebooks...")
        await page.goto("http://localhost:8502/notebooks")
        await page.wait_for_load_state("networkidle")
        
        print("Clicking the Tetrel OT card...")
        card = page.locator("div.group", has_text="Tetrel OT").first
        await card.click()
        
        await page.wait_for_timeout(4000)
        await page.wait_for_load_state("networkidle")
        
        print("Clicking B2B Proposal Workspace button...")
        b2b_button = page.locator("button:has-text('B2B Proposal Workspace')")
        await b2b_button.click()
        await page.wait_for_timeout(2000)
        
        print("Switching to CSET Compliance Quiz tab...")
        quiz_tab = page.locator("button:has-text('CSET Compliance Quiz')")
        await quiz_tab.click()
        await page.wait_for_timeout(2000)
        
        options = await page.locator("select >> option").all_inner_texts()
        print(f"Dropdown options found: {options}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
