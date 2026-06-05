import sys
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8502"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navigating to {BASE_URL}/podcasts...")
        page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
        page.wait_for_timeout(3000)
        
        # Take a screenshot
        screenshot_path = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_page_initial.png"
        page.screenshot(path=screenshot_path)
        print(f"Initial screenshot saved to: {screenshot_path}")
        
        # List all buttons
        buttons = page.locator("button").all()
        print("\nFound buttons:")
        for idx, btn in enumerate(buttons):
            text = btn.text_content().strip()
            print(f"Button {idx}: '{text}'")
            
        browser.close()

if __name__ == "__main__":
    main()
