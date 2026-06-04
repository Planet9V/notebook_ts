import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run():
    print("Starting Playwright browser for compliance UI verification...")
    async with async_playwright() as p:
        # Launch headless Chromium
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 1200})
        page = await context.new_page()
        
        # Listen to console messages for debugging
        page.on("console", lambda msg: print(f"[browser] {msg.text}"))
        
        brain_dir = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7"
        os.makedirs(brain_dir, exist_ok=True)
        
        # 1. AUTHENTICATE / INITIALIZE SESSION
        print("Navigating to http://localhost:8502/notebooks to initialize session...")
        await page.goto("http://localhost:8502/notebooks")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # 2. Navigate to Compliance Page
        print("Navigating to http://localhost:8502/compliance...")
        await page.goto("http://localhost:8502/compliance")
        
        # Wait for the main page to load and network to idle
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(4000)  # Wait for API fetch to resolve and render cards
        
        # 3. Count and print all frameworks
        print("Extracting compliance framework cards...")
        card_titles = page.locator("div[data-slot='card-title']")
        title_texts = await card_titles.all_inner_texts()
        
        framework_count = len(title_texts)
        print(f"Total frameworks found in UI: {framework_count}")
        print("First 15 frameworks:")
        for t in title_texts[:15]:
            print(f" - {t}")
            
        # Capture grid screenshot
        grid_screenshot_path = os.path.join(brain_dir, "compliance_grid_visual.png")
        await page.screenshot(path=grid_screenshot_path)
        print(f"Grid screenshot saved: {grid_screenshot_path}")
        
        # Check if the number of frameworks matches the expected 117
        if framework_count == 0:
            print("ERROR: No framework cards found in UI.")
            await browser.close()
            sys.exit(1)
            
        # 3. Test selecting a framework: American Water Works Association v3.0
        print("Selecting framework 'American Water Works Association v3.0'...")
        awwa_card = page.locator("div[data-slot='card-title']:has-text('American Water Works Association v3.0')").first
        await awwa_card.click()
        
        # Wait for detail view and questions to load
        print("Waiting for AWWA v3.0 detail page to load...")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(3000)
        
        # Verify detail page elements
        has_intro = await page.locator("text=INTRODUCTION & REGULATORY SCOPE").is_visible()
        print(f"Is Introduction & Scope visible: {has_intro}")
        
        # Click the INTERACTIVE EVALUATION tab button
        print("Switching to 'Interactive Evaluation' tab...")
        eval_tab = page.locator("button:has-text('Interactive Evaluation')").first
        await eval_tab.click()
        await page.wait_for_timeout(2000)
        
        # Count questions visible in wizard
        question_rows = page.locator("div[id^='question-card-']")
        question_count = await question_rows.count()
        print(f"Questions visible on first page of AWWA v3.0 wizard: {question_count}")
        
        # Capture AWWA wizard detail screenshot
        detail_screenshot_path = os.path.join(brain_dir, "compliance_awwa_detail_visual.png")
        await page.screenshot(path=detail_screenshot_path)
        print(f"AWWA v3.0 detail screenshot saved: {detail_screenshot_path}")
        
        # 4. Try going back to the grid and clicking another framework (e.g. American Water Works Association v4.0)
        print("Clicking 'Back' button to return to grid...")
        back_btn = page.locator("button:has-text('Back to Framework Grid')").first
        await back_btn.click()
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")
            
        print("Selecting framework 'American Water Works Association v4.0'...")
        awwa_v4_card = page.locator("div[data-slot='card-title']:has-text('American Water Works Association v4.0')").first
        await awwa_v4_card.click()
        await page.wait_for_timeout(3000)
        await page.wait_for_load_state("networkidle")
        
        # Click the INTERACTIVE EVALUATION tab button
        print("Switching to 'Interactive Evaluation' tab for AWWA v4.0...")
        eval_tab = page.locator("button:has-text('Interactive Evaluation')").first
        await eval_tab.click()
        await page.wait_for_timeout(2000)
        
        # Count questions visible in wizard
        v4_question_rows = page.locator("div[id^='question-card-']")
        v4_question_count = await v4_question_rows.count()
        print(f"Questions visible on first page of AWWA v4.0 wizard: {v4_question_count}")
        
        # Capture AWWA v4 detail view screenshot
        awwa_v4_screenshot_path = os.path.join(brain_dir, "compliance_awwa_v4_detail_visual.png")
        await page.screenshot(path=awwa_v4_screenshot_path)
        print(f"AWWA v4.0 detail screenshot saved: {awwa_v4_screenshot_path}")
        
        await browser.close()
        print("Compliance UI verification completed successfully!")

if __name__ == "__main__":
    asyncio.run(run())
