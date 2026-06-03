import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run():
    print("Initializing Playwright browser for visual validation...")
    async with async_playwright() as p:
        # Launch headless Chromium
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        # Listen to console messages and network requests for debugging
        page.on("console", lambda msg: print(f"[browser] {msg.text}"))
        page.on("request", lambda req: print(f"[request] {req.method} {req.url}"))
        page.on("response", lambda res: print(f"[response] {res.status} {res.url}"))
        
        # Define output directory (artifacts directory)
        brain_dir = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7"
        os.makedirs(brain_dir, exist_ok=True)
        
        # 1. AUTHENTICATE / INITIALIZE SESSION
        print("Navigating to http://localhost:3000/notebooks to initialize session...")
        await page.goto("http://localhost:3000/notebooks")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # 2. VALIDATE SEARCH PAGE SLIDERS (TASK A)
        print("Navigating to http://localhost:3000/search?mode=search...")
        await page.goto("http://localhost:3000/search?mode=search")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Type search query
        print("Typing search query...")
        await page.locator("input#search-query").fill("ICS firewall rules")
        
        # Toggle or click "Search Settings" button
        print("Expanding Search Settings panel...")
        config_btn = page.locator("button:has-text('Search Settings')")
        await config_btn.click()
        await page.wait_for_timeout(1000)
            
        # Capture Search configuration sliders screenshot
        search_config_path = os.path.join(brain_dir, "search_config_sliders.png")
        await page.screenshot(path=search_config_path)
        print(f"Search Config Sliders screenshot saved: {search_config_path}")
        
        # 3. VALIDATE RERANKER COMPARISON SANDBOX (TASK B)
        print("Navigating to http://localhost:3000/advanced...")
        await page.goto("http://localhost:3000/advanced")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # Locate the sandbox query input field
        print("Locating Sandbox input...")
        sandbox_input = page.locator("input#compare-query")
        await sandbox_input.scroll_into_view_if_needed()
        await sandbox_input.fill("firewall")
        
        # Click the compare button
        print("Triggering raw vs reranked search comparison...")
        compare_btn = page.locator("button:has-text('Compare')").first
        await compare_btn.click()
        
        # Wait for results to load
        print("Waiting for comparison results to load...")
        await page.wait_for_timeout(4000) # Give it 4 seconds for LLM reranker
        await page.wait_for_load_state("networkidle")
        
        # Scroll sandbox results into view
        print("Scrolling Reranker Sandbox results into view...")
        results_header = page.locator("text=Raw Vector Latency").first
        if await results_header.is_visible():
            await results_header.scroll_into_view_if_needed()
        else:
            await page.evaluate("window.scrollBy(0, 500)")
        await page.wait_for_timeout(1000)
        
        # Capture Reranker Sandbox Comparison screenshot
        sandbox_path = os.path.join(brain_dir, "reranker_sandbox_dashboard.png")
        await page.screenshot(path=sandbox_path)
        print(f"Reranker Sandbox comparison screenshot saved: {sandbox_path}")
        
        # 4. VALIDATE DRAFTING COPILOT SUGGESTIONS (TASK D)
        print("Navigating back to http://localhost:3000/notebooks to access workspace...")
        await page.goto("http://localhost:3000/notebooks")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        print("Navigating to Tetrel OT workspace...")
        card = page.locator("div.group", has_text="Tetrel OT").first
        await card.click()
        await page.wait_for_timeout(4000)
        await page.wait_for_load_state("networkidle")
        
        print("Switching to B2B Proposal Workspace mode...")
        b2b_button = page.locator("button:has-text('B2B Proposal Workspace')")
        await b2b_button.click()
        await page.wait_for_timeout(2000)
        
        # Verify Drafting Copilot is visible
        copilot_header = page.locator("text=Drafting Copilot").first
        if await copilot_header.is_visible():
            print("Verified SOW Drafting Copilot panel is visible!")
        else:
            print("WARNING: SOW Drafting Copilot panel not visible.")
            
        # Type into the Copilot input context textarea
        print("Entering custom SOW text context...")
        textarea = page.locator("textarea[placeholder*='Selected text context']").first
        await textarea.fill("This section covers the industrial control system boundary protection rules.")
        
        # Click Generate to run autocomplete agent
        print("Clicking Generate to trigger Drafting Copilot agent...")
        generate_btn = page.locator("button:has-text('Generate')").first
        await generate_btn.click()
        
        # Wait for AI suggestion to generate
        print("Waiting for drafting suggestions...")
        await page.wait_for_timeout(4000)
        await page.wait_for_load_state("networkidle")
        
        # Capture SOW Drafting suggestions screenshot
        drafting_path = os.path.join(brain_dir, "draft_copilot_suggestions.png")
        await page.screenshot(path=drafting_path)
        print(f"SOW Drafting suggestions screenshot saved: {drafting_path}")
        
        await browser.close()
        print("Visual validation run completed successfully!")

if __name__ == "__main__":
    asyncio.run(run())
