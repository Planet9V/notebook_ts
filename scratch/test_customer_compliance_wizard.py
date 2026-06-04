from playwright.sync_api import sync_playwright
import sys
import os

BASE_URL = "http://localhost:8502"

def test_customer_compliance_wizard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console logs
        console_logs = []
        def log_console(msg):
            text = msg.text
            print(f"[CONSOLE] {text}")
            console_logs.append(text)
        page.on("console", log_console)

        # Capture network requests and responses
        def log_request(request):
            print(f"[REQUEST] {request.method} {request.url}")
        def log_response(response):
            if response.status >= 400:
                print(f"[RESPONSE ERROR] {response.status} {response.url}")
            else:
                print(f"[RESPONSE] {response.status} {response.url}")
        page.on("request", log_request)
        page.on("response", log_response)

        print(f"Navigating to {BASE_URL}...")
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(2000)

        print("Navigating to /customers...")
        page.goto(f"{BASE_URL}/customers", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Click on the first customer name link
        print("Clicking first customer name link...")
        first_cust_link = page.locator("a[href^='/customers/']").first
        if not first_cust_link.is_visible():
            print("ERROR: No customer links found in ledger table!")
            browser.close()
            sys.exit(1)
            
        first_cust_link.click()
        page.wait_for_timeout(2000)
        page.wait_for_load_state("networkidle")

        # Click on COMPLIANCE WIZARD (CSET) tab
        print("Clicking COMPLIANCE WIZARD (CSET) tab...")
        tab_btn = page.locator("button:has-text('COMPLIANCE WIZARD (CSET)')").first
        tab_btn.click()
        page.wait_for_timeout(2000)

        # Check if Audited Regulatory Frameworks is visible
        print("Checking Audited Regulatory Frameworks card...")
        card_title = page.locator("div:has-text('Audited Regulatory Frameworks')").first
        if not card_title.is_visible():
            print("ERROR: Audited Regulatory Frameworks card not found!")
            browser.close()
            sys.exit(1)

        # Look for 'Compliance Wizard' or '+ Initialize Assessment' buttons specifically for IEC 62443-3-3
        print("Locating IEC 62443-3-3 framework row...")
        fw_row = page.locator("div.divide-y > div:has-text('IEC 62443-3-3')").first
        if not fw_row.is_visible():
            print("WARNING: IEC 62443-3-3 not found, falling back to first available row...")
            fw_row = page.locator("div.divide-y > div").first

        wizard_btn = fw_row.locator("button:has-text('Compliance Wizard')").first
        init_btn = fw_row.locator("button:has-text('Initialize Assessment')").first

        if wizard_btn.is_visible():
            print("Found active assessment. Clicking 'Compliance Wizard' button directly...")
            wizard_btn.click()
        elif init_btn.is_visible():
            print("Found pending assessment. Clicking '+ Initialize Assessment' (which should auto-initialize and launch wizard)...")
            init_btn.click()
        else:
            print("ERROR: Neither 'Compliance Wizard' nor 'Initialize Assessment' button is visible in targeted row!")
            browser.close()
            sys.exit(1)

        # Wait for the wizard questionnaire to load
        print("Waiting for CSET Auditing Wizard to launch...")
        page.wait_for_timeout(3000)

        # Verify active wizard bar is visible
        wizard_header = page.locator("div:has-text('Active CSET Auditing Wizard')").first
        if not wizard_header.is_visible():
            print("ERROR: Active CSET Auditing Wizard header not visible! Direct launch failed.")
            browser.close()
            sys.exit(1)
        print("✅ SUCCESS: Auditing Wizard questionnaire launched directly!")

        # Verify we can see a question
        question_text = page.locator("div.select-text:has-text('?')").first
        if question_text.is_visible():
            print(f"Current question text preview: '{question_text.text_content()[:60]}...'")
        else:
            print("WARNING: Question text locator is not visible!")

        # Click the "YES" button to answer and test autosave
        print("Clicking 'YES' choice button to trigger answer save...")
        yes_btn = page.locator("button:has-text('YES')").first
        if not yes_btn.is_visible():
            print("ERROR: 'YES' button not found in choices!")
            # Dump page info for debugging
            print("=== PAGE HTML SNIPPET ===")
            print(page.locator("body").inner_html()[:2000])
            # Save screenshot
            screenshot_path = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/failure_screenshot.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")
            browser.close()
            sys.exit(1)
        
        yes_btn.click()
        print("Wait for autosave to complete...")
        page.wait_for_timeout(2000)

        # Verify no network/API errors occurred containing "undefined"
        undefined_errors = [log for log in console_logs if "undefined" in log.lower() and "404" in log]
        if undefined_errors:
            print(f"❌ FAILURE: Detected API save failures due to undefined path: {undefined_errors}")
            browser.close()
            sys.exit(1)
        else:
            print("✅ SUCCESS: Autosave triggered cleanly with no 'undefined' routing errors!")

        # Click "Close Wizard"
        print("Clicking 'Close Wizard' button...")
        close_btn = page.locator("button:has-text('Close Wizard')").first
        close_btn.click()
        page.wait_for_timeout(1000)

        # Verify we are back to framework ledger
        if card_title.is_visible():
            print("✅ SUCCESS: Returned back to frameworks ledger view!")
            browser.close()
            sys.exit(0)
        else:
            print("❌ FAILURE: Close Wizard did not return back to frameworks ledger!")
            browser.close()
            sys.exit(1)

if __name__ == "__main__":
    test_customer_compliance_wizard()
