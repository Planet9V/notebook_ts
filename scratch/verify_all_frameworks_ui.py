import asyncio
import os
import sys
from playwright.async_api import async_playwright

# List of known empty custom/placeholder frameworks in the database
EMPTY_FRAMEWORKS = {
    "HHS405dAAA",
    "Question Set - 1A",
    "Rapid Assessment Control Set",
    "Test custom module",
    "Framework 799a04b3"
}

async def run():
    print("Starting Playwright browser for exhaustive compliance UI audit...")
    async with async_playwright() as p:
        # Launch headless Chromium
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1600, "height": 1200})
        page = await context.new_page()
        
        # 1. AUTHENTICATE / INITIALIZE SESSION
        print("Authenticating session at http://localhost:8502/notebooks...")
        await page.goto("http://localhost:8502/notebooks")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(2000)
        
        # 2. Navigate to Compliance Page
        print("Navigating to http://localhost:8502/compliance...")
        await page.goto("http://localhost:8502/compliance")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(4000)  # Let cards load
        
        # 3. Extract all card elements
        card_locators = page.locator("div[data-slot='card-title']")
        title_texts = await card_locators.all_inner_texts()
        total_frameworks = len(title_texts)
        print(f"Detected {total_frameworks} framework cards in the UI.")
        
        if total_frameworks != 117:
            print(f"WARNING: Found {total_frameworks} cards, expected 117.")
            
        results = []
        failures = 0
        
        # 4. Loop through ALL frameworks
        for idx, title in enumerate(title_texts):
            print(f"[{idx+1}/{total_frameworks}] Auditing: '{title}'...")
            
            try:
                # Find the card and click it
                card = page.locator(f"div[data-slot='card-title']:has-text('{title}')").first
                await card.scroll_into_view_if_needed()
                await card.click()
                
                # Wait for detail view to render
                back_btn = page.locator("button:has-text('Back to Framework Grid')").first
                await back_btn.wait_for(state="visible", timeout=10000)
                
                # Switch to Interactive Evaluation tab
                eval_tab = page.locator("button:has-text('Interactive Evaluation')").first
                await eval_tab.click()
                
                # Wait for loading text to disappear
                loading_msg = page.locator("text=Loading compliance controls")
                await page.wait_for_timeout(500) # Quick breather for state update
                if await loading_msg.is_visible():
                    await loading_msg.wait_for(state="hidden", timeout=15000)
                
                # Count questions
                question_rows = page.locator("div[id^='question-card-']")
                question_count = await question_rows.count()
                
                # Check against expected count
                is_empty_allowed = any(empty_name in title for empty_name in EMPTY_FRAMEWORKS)
                
                if question_count == 0 and not is_empty_allowed:
                    print(f" ❌ ERROR: '{title}' returned 0 questions but is not a known empty framework!")
                    failures += 1
                    results.append((title, "FAIL (0 questions)"))
                else:
                    print(f"  ✅ Verified: questions count = {question_count}")
                    results.append((title, f"PASS ({question_count} questions)"))
                    
                # Click back to grid
                await back_btn.click()
                # Wait for grid to render again
                await page.locator("div[data-slot='card-title']").first.wait_for(state="visible", timeout=10000)
                
            except Exception as e:
                print(f" ❌ FAILED to audit '{title}': {e}")
                failures += 1
                results.append((title, f"ERROR: {e}"))
                # Try navigating back to compliance page if stuck
                await page.goto("http://localhost:8502/compliance")
                await page.wait_for_load_state("networkidle")
                await page.wait_for_timeout(3000)
                
        # 5. Compile and print summary
        print("\n" + "="*50)
        print("EXHAUSTIVE UI AUDIT SUMMARY")
        print(f"Total frameworks checked: {total_frameworks}")
        print(f"Passed audits: {total_frameworks - failures}")
        print(f"Failed audits: {failures}")
        
        # Save detailed log to artifacts
        brain_dir = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7"
        log_path = os.path.join(brain_dir, "exhaustive_ui_compliance_audit.log")
        with open(log_path, "w") as f:
            f.write("EXHAUSTIVE UI COMPLIANCE AUDIT LOG\n")
            f.write(f"Total Frameworks: {total_frameworks}\n")
            f.write(f"Failed: {failures}\n\n")
            for name, status in results:
                f.write(f"{name}: {status}\n")
        print(f"Detailed log saved to: {log_path}")
        
        await browser.close()
        
        if failures > 0:
            print("AUDIT FAILED due to errors.")
            sys.exit(1)
        else:
            print("AUDIT PASSED successfully!")
            sys.exit(0)

if __name__ == "__main__":
    asyncio.run(run())
