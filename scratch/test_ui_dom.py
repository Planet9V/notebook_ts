import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:8502/notebooks")
        await page.wait_for_load_state("networkidle")
        
        # Log all elements matching typical selectors
        cards = await page.locator("div.border").all_inner_texts()
        print("--- Active Cards ---")
        for idx, c in enumerate(cards):
            print(f"Card {idx}: {repr(c)}")
            
        links = await page.locator("a").all_inner_texts()
        print("\n--- Active Links ---")
        for idx, l in enumerate(links):
            print(f"Link {idx}: {repr(l)}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
