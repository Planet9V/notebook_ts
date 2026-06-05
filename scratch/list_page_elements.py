from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    print(f"Navigating to {BASE_URL}/podcasts...")
    page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
    page.wait_for_timeout(2000)
    
    print(f"Current URL: {page.url}")
    
    # Take a screenshot to verify what is visible
    page.screenshot(path="scratch/podcasts_page.png")
    print("Screenshot saved to scratch/podcasts_page.png")
    
    # List all buttons and role="tab" elements
    print("\n--- Listing buttons ---")
    buttons = page.locator("button").all()
    for i, btn in enumerate(buttons):
        try:
            print(f"Button {i}: text='{btn.text_content().strip()}', visible={btn.is_visible()}")
        except Exception as e:
            print(f"Button {i}: error {e}")
            
    print("\n--- Listing tabs ---")
    tabs = page.locator("[role='tab']").all()
    for i, tab in enumerate(tabs):
        try:
            print(f"Tab {i}: text='{tab.text_content().strip()}', value='{tab.get_attribute('value')}', data-value='{tab.get_attribute('data-value')}', visible={tab.is_visible()}")
        except Exception as e:
            print(f"Tab {i}: error {e}")

    browser.close()
