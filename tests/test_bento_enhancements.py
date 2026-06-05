#!/usr/bin/env python3
"""
E2E Playwright test script for Bento-Grid Customer Dossier View enhancements.
"""

import sys
import time
import json
import traceback
import re
from playwright.sync_api import sync_playwright, expect

# Constants
BASE_URL = "http://localhost:3000"
CUSTOMER_THREAT = "rb4qbxge1hgysmks7wdr"  # Customer with active threat (activeThreatCount = 2)
CUSTOMER_SECURE = "o9xp6yesfb84jwyxar67"  # Customer with secure state (activeThreatCount = 0)

# Logger for console and network
class TestLogger:
    def __init__(self):
        self.console_logs = []
        self.network_requests = []
        self.network_responses = []

    def log_console(self, msg):
        log_str = f"[CONSOLE] {msg.type.upper()}: {msg.text}"
        print(log_str)
        self.console_logs.append(log_str)

    def log_request(self, req):
        log_str = f"[NET REQ] {req.method} {req.url}"
        print(log_str)
        self.network_requests.append(log_str)

    def log_response(self, res):
        log_str = f"[NET RES] {res.status} {res.url}"
        print(log_str)
        self.network_responses.append(log_str)

def run_tests():
    logger = TestLogger()
    print("🚀 Starting Bento Grid E2E Test Suite...")

    with sync_playwright() as p:
        # Launch headless chromium browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Wire up console and network logging
        page.on("console", logger.log_console)
        page.on("request", logger.log_request)
        page.on("response", logger.log_response)
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))

        try:
            # Authenticate session in localStorage before navigating
            print("Authenticating E2E session...")
            page.goto(BASE_URL)
            page.evaluate("() => localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'not-required', isAuthenticated: true }, version: 0 }))")
            page.wait_for_timeout(200)

            # ----------------------------------------------------------------------
            # Test Case 1: Viewport responsive test
            # Verify that the edit layout toggle button and drag handles are hidden on screen width < 1024px
            # ----------------------------------------------------------------------
            print("\n=== Test Case 1: Viewport Responsive Checks ===")
            # Set viewport to mobile width (e.g., 800px)
            page.set_viewport_size({"width": 800, "height": 600})
            page.goto(f"{BASE_URL}/customers/{CUSTOMER_THREAT}/bento")
            
            # Wait for bento console to load
            print("Waiting for page load...")
            try:
                page.wait_for_selector("text=Bento Preview", timeout=10000)
            except Exception as e:
                print("Failed waiting for selector! Taking debug screenshot and HTML dump...")
                page.screenshot(path="debug_bento.png")
                with open("debug_bento.html", "w", encoding="utf-8") as f:
                    f.write(page.content())
                raise e

            # Verify Edit Layout button is NOT present/visible
            edit_btn = page.locator("button:has-text('Grid Layout')")
            expect(edit_btn).to_be_hidden()
            print("✅ Success: Edit Grid Layout button is hidden on mobile viewport (< 1024px)")

            # Verify no drag handles are visible
            drag_handles = page.locator("[title='Drag to reorder card']")
            expect(drag_handles).to_have_count(0)
            print("✅ Success: Drag handles are not rendered on mobile viewport")

            # Resize viewport to desktop width (e.g., 1280px)
            page.set_viewport_size({"width": 1280, "height": 800})
            # Wait for state changes / resize handler to register
            page.wait_for_timeout(500)
            page.wait_for_selector("[data-rfd-draggable-id='card-risk']", timeout=5000)
            expect(edit_btn).to_be_visible()
            print("✅ Success: Edit Grid Layout button is visible on desktop viewport (>= 1024px)")

            # ----------------------------------------------------------------------
            # Test Case 2: Entering and exiting grid edit layout mode
            # ----------------------------------------------------------------------
            print("\n=== Test Case 2: Edit Layout Mode Toggle ===")
            # Check initial state: button is "Edit Grid Layout", drag handles should be absent/hidden
            expect(edit_btn).to_have_text("🛠️ Edit Grid Layout")
            expect(page.locator("[title='Drag to reorder card']")).to_have_count(0)
            print("✅ Success: In normal mode, drag handles are absent")

            # Toggle to Edit Mode
            edit_btn.click()
            # Verify button text updates
            expect(edit_btn).to_have_text("🔒 Save Grid Layout")
            print("✅ Success: Button text toggled to '🔒 Save Grid Layout'")

            # Verify Reset button appears
            reset_btn = page.locator("button:has-text('Reset')")
            expect(reset_btn).to_be_visible()
            print("✅ Success: Reset Layout button is visible in edit mode")

            # Verify drag handles are now visible (should be 5, one on each card)
            expect(page.locator("[title='Drag to reorder card']")).to_have_count(5)
            print("✅ Success: In edit mode, 5 drag handles are present")

            # Exit Edit Mode
            edit_btn.click()
            expect(edit_btn).to_have_text("🛠️ Edit Grid Layout")
            expect(page.locator("[title='Drag to reorder card']")).to_have_count(0)
            print("✅ Success: Exiting edit mode restores button text and removes drag handles")

            # ----------------------------------------------------------------------
            # Test Case 3: Dragging, reordering bento cards, and localStorage persistence
            # ----------------------------------------------------------------------
            print("\n=== Test Case 3: Drag & Drop Card Reordering and Persistence ===")
            # Re-enter edit mode
            edit_btn.click()
            page.wait_for_timeout(500)

            # Get initial card order
            initial_cards = page.locator("[data-rfd-draggable-id]")
            initial_order = [initial_cards.nth(i).get_attribute("data-rfd-draggable-id") for i in range(5)]
            print(f"Initial layout order in DOM: {initial_order}")
            assert initial_order[0] == "card-compliance", "First card should be card-compliance"

            # Focus compliance card drag handle and perform keyboard-based reordering
            compliance_handle = page.locator("[data-rfd-draggable-id='card-compliance'] [title='Drag to reorder card']")
            compliance_handle.focus()
            page.keyboard.press("Space")
            page.wait_for_timeout(300)
            page.keyboard.press("ArrowDown")
            page.wait_for_timeout(300)
            page.keyboard.press("Space")
            page.wait_for_timeout(500)

            # Get new card order
            post_drag_cards = page.locator("[data-rfd-draggable-id]")
            post_drag_order = [post_drag_cards.nth(i).get_attribute("data-rfd-draggable-id") for i in range(5)]
            print(f"Post-drag layout order in DOM: {post_drag_order}")
            assert post_drag_order[0] != "card-compliance", "Compliance card should have moved down"

            # Verify new order is saved to localStorage
            ls_key = f"bento_layout_customer:{CUSTOMER_THREAT}"
            saved_layout_str = page.evaluate(f"() => localStorage.getItem('{ls_key}')")
            print(f"Saved layout in localStorage: {saved_layout_str}")
            assert saved_layout_str is not None, "Layout should be saved to localStorage"
            saved_layout = json.loads(saved_layout_str)
            assert saved_layout == post_drag_order, "localStorage layout must match new DOM layout order"
            print("✅ Success: Drag & Drop successfully updated order in DOM and localStorage")

            # Save layout / exit edit mode
            edit_btn.click()
            page.wait_for_timeout(500)

            # Reload the page to test persistence
            print("Reloading page to verify persistence...")
            page.reload()
            page.wait_for_selector("[data-rfd-draggable-id='card-risk']", timeout=10000)

            # Check DOM order after reload
            post_reload_cards = page.locator("[data-rfd-draggable-id]")
            post_reload_order = [post_reload_cards.nth(i).get_attribute("data-rfd-draggable-id") for i in range(5)]
            print(f"Post-reload layout order in DOM: {post_reload_order}")
            assert post_reload_order == post_drag_order, "Reloaded DOM layout order should match the saved layout"
            print("✅ Success: Reload persistence verified successfully")

            # ----------------------------------------------------------------------
            # Test Case 4: Reset Layout
            # ----------------------------------------------------------------------
            print("\n=== Test Case 4: Reset Layout Button ===")
            # Enter edit mode again
            edit_btn.click()
            page.wait_for_timeout(500)

            # Find and click the Reset button
            reset_btn = page.locator("button:has-text('Reset')")
            reset_btn.click()
            page.wait_for_timeout(500)

            # Check DOM order is restored to default
            restored_cards = page.locator("[data-rfd-draggable-id]")
            restored_order = [restored_cards.nth(i).get_attribute("data-rfd-draggable-id") for i in range(5)]
            print(f"Restored layout order in DOM: {restored_order}")
            assert restored_order[0] == "card-compliance", "Reset layout should place card-compliance back to first position"

            # Check localStorage is cleared
            cleared_layout = page.evaluate(f"() => localStorage.getItem('{ls_key}')")
            print(f"localStorage after reset: {cleared_layout}")
            assert cleared_layout is None, "localStorage item should be removed on reset"
            print("✅ Success: Reset layout restores default layout and clears localStorage")

            # Exit edit mode
            edit_btn.click()
            page.wait_for_timeout(500)

            # ----------------------------------------------------------------------
            # Test Case 5: Search input filter
            # ----------------------------------------------------------------------
            print("\n=== Test Case 5: Search Input Filter ===")
            search_input = page.locator("input[placeholder*='Filter console...']")
            expect(search_input).to_be_visible()

            # Type search query "Threat"
            search_input.fill("Threat")
            # Wait for 300ms to account for 100ms debouncing + DOM update
            page.wait_for_timeout(300)

            # Verify dimming (non-matching card card-compliance gets opacity-40)
            compliance_card = page.locator("[data-rfd-draggable-id='card-compliance'] > div")
            expect(compliance_card).to_have_class(re.compile(r"opacity-40"))
            print("✅ Success: Non-matching cards are dimmed (opacity-40)")

            # Verify matching card card-risk is not dimmed (keeps opacity-100 or does not have opacity-40)
            risk_card = page.locator("[data-rfd-draggable-id='card-risk'] > div")
            expect(risk_card).not_to_have_class(re.compile(r"opacity-40"))
            print("✅ Success: Matching cards are not dimmed")

            # Verify cyan highlighting of matched text
            mark_highlight = page.locator("mark.bg-cyan-500\\/30")
            assert mark_highlight.count() >= 1, "Expected at least one highlighted text segment"
            print(f"✅ Success: Highlights with mark styling bg-cyan-500/30 are present. Text found: {mark_highlight.first.text_content()}")

            # Test ESC clearing via ESC button
            esc_btn = page.locator("button:has-text('ESC')")
            expect(esc_btn).to_be_visible()
            esc_btn.click()
            page.wait_for_timeout(200)
            
            # Verify input is empty and no cards are dimmed
            expect(search_input).to_have_value("")
            expect(compliance_card).not_to_have_class(re.compile(r"opacity-40"))
            print("✅ Success: Clear button resets search and restores card opacities")

            # Test Input Sanitization
            search_input.fill("[a-z]*")
            page.wait_for_timeout(300)
            # Should not crash. Check if all cards are dimmed (since '[a-z]*' matches nothing literally)
            expect(compliance_card).to_have_class(re.compile(r"opacity-40"))
            print("✅ Success: Search input is correctly sanitized and does not cause regex runtime crash")

            # Clear search via keyboard Escape key
            search_input.focus()
            page.keyboard.press("Escape")
            page.wait_for_timeout(200)
            expect(search_input).to_have_value("")
            expect(compliance_card).not_to_have_class(re.compile(r"opacity-40"))
            print("✅ Success: Escape key clears search and restores card opacities")

            # ----------------------------------------------------------------------
            # Test Case 6: Visual status borders and glow effects
            # ----------------------------------------------------------------------
            print("\n=== Test Case 6: Visual Status Borders and Glow Effects ===")

            # Part 6a: Risk & Warnings card threat alerts glow
            # For CUSTOMER_THREAT: activeThreatCount = 2 (> 0) -> orange glow / shadow
            print(f"Verifying Risk & Warnings threat alert glow for threat customer: {CUSTOMER_THREAT}")
            # The card should have classes: border-orange-500/60 and shadow-[0_0_15px_rgba(249,115,22,0.2)]
            expect(risk_card).to_have_class(re.compile(r"border-orange-500/60"))
            print("✅ Success: Risk card has orange border/glow when activeThreatCount > 0")

            # For CUSTOMER_SECURE: activeThreatCount = 0 -> green glow / shadow
            print(f"Verifying Risk & Warnings secure state glow for secure customer: {CUSTOMER_SECURE}")
            page.goto(f"{BASE_URL}/customers/{CUSTOMER_SECURE}/bento")
            page.wait_for_selector("[data-rfd-draggable-id='card-risk']", timeout=10000)
            secure_risk_card = page.locator("[data-rfd-draggable-id='card-risk'] > div")
            expect(secure_risk_card).to_have_class(re.compile(r"border-emerald-500/60"))
            print("✅ Success: Risk card has emerald border/glow when activeThreatCount == 0")

            # Part 6b: CFATS Compliance card score glow
            # Default compliance is low for customer (< 50) -> orange border
            compliance_card_secure = page.locator("[data-rfd-draggable-id='card-compliance'] > div")
            expect(compliance_card_secure).to_have_class(re.compile(r"border-orange-500/60"))
            print("✅ Success: Compliance card has orange border/glow when compliance score < 50")

            # Use page routing to intercept the compliance rollup endpoint and mock a high compliance score (>= 50)
            print("Mocking compliance rollup to return a high score (95%)...")
            mock_rollup = {
                "customer_id": f"customer:{CUSTOMER_SECURE}",
                "frameworks": [
                    {
                        "framework_id": "TSA_RAIL",
                        "framework_name": "TSA",
                        "facilities": [
                            {
                               "location_id": "loc:123",
                               "facility_name": "Main Site",
                               "status": "COMPLETED",
                               "compliance_score": 95.0
                            }
                        ],
                        "average_compliance_score": 95.0,
                        "average_completion_percentage": 100.0,
                        "total_facilities_assessed": 1
                    }
                ]
            }
            
            # Intercept and stub the API call
            page.route(
                f"**/api/customers/customer:{CUSTOMER_SECURE}/compliance-rollup",
                lambda route: route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps(mock_rollup)
                )
            )

            # Reload to trigger mock API response
            page.reload()
            page.wait_for_selector("[data-rfd-draggable-id='card-compliance']", timeout=10000)
            
            # Re-check the compliance card's border class
            mocked_compliance_card = page.locator("[data-rfd-draggable-id='card-compliance'] > div")
            # Since score is now 95% (>= 50), the card should have: border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]
            expect(mocked_compliance_card).to_have_class(re.compile(r"border-cyan-500/60"))
            print("✅ Success: Compliance card switches to cyan border/glow when compliance score >= 50")

        except Exception as e:
            print(f"❌ Test encountered an error: {e}")
            traceback.print_exc()
            sys.exit(1)
        finally:
            context.close()
            browser.close()

    print("\n🎉 All E2E test scenarios passed successfully!")

if __name__ == "__main__":
    run_tests()
