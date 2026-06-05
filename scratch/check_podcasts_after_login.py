import sys
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8502"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Monitor redirects
        page.on("framenavigated", lambda frame: print(f"Frame navigated to: {frame.url}"))
        
        print(f"Navigating to {BASE_URL} to trigger auto-login...")
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(3000)
        
        print(f"Current URL: {page.url}")
        
        print("Navigating to /podcasts...")
        page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
        page.wait_for_timeout(3000)
        
        print(f"Final URL: {page.url}")
        print(f"Page Title: {page.title()}")
        
        # Take a screenshot
        screenshot_path = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_page_after_login.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to: {screenshot_path}")
        
        # Check if "Generate Podcast" button is visible
        btn = page.locator("button:has-text('Generate Podcast')").first
        if btn.is_visible():
            print("✅ SUCCESS: 'Generate Podcast' button is visible!")
        else:
            print("❌ FAILURE: 'Generate Podcast' button is NOT visible!")
            # Print button texts
            buttons = page.locator("button").all()
            print("Visible buttons:")
            for idx, b in enumerate(buttons):
                t = b.text_content().strip()
                if t:
                    print(f"  - {t}")
                    
        browser.close()

if __name__ == "__main__":
    main()
