import sys
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8502"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Monitor redirects and URL changes
        page.on("framenavigated", lambda frame: print(f"Frame navigated to: {frame.url}"))
        
        print(f"Navigating to {BASE_URL}/podcasts...")
        page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
        page.wait_for_timeout(3000)
        
        print(f"Final URL: {page.url}")
        print(f"Page Title: {page.title()}")
        
        # Let's take a screenshot
        page.screenshot(path="/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_page_final_url.png")
        
        browser.close()

if __name__ == "__main__":
    main()
