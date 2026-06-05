import os
import sys
import asyncio
from playwright.async_api import async_playwright

SESSION_DIR = "data/sessions"
os.makedirs(SESSION_DIR, exist_ok=True)

async def capture_session(platform: str):
    """
    Launches a headful browser, navigates to the login page of the specified platform,
    and waits for the user to log in and complete MFA. Once logged in, the session
    cookies and localStorage are saved to a file so subsequent runs can post headlessly.
    """
    platform = platform.lower()
    if platform not in ("x", "linkedin"):
        print("Invalid platform. Please choose 'x' or 'linkedin'.")
        return

    session_file = os.path.join(SESSION_DIR, f"{platform}_state.json")
    print(f"Starting headful browser to capture session for {platform.upper()}...")
    
    async with async_playwright() as p:
        # Launch headful browser
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        if platform == "x":
            await page.goto("https://x.com/login")
            print("\n*** ACTION REQUIRED ***")
            print("Please log in to X/Twitter in the browser window.")
            print("Ensure you complete any MFA/verification steps.")
            print("The script will capture the session as soon as you reach the Home page feed.\n")
            
            # Wait for tweet textarea to appear (confirms user is logged in and on Home page)
            try:
                await page.wait_for_selector('div[data-testid="tweetTextarea_0"]', timeout=180000)
            except Exception as e:
                print("Timeout waiting for homepage. Session not captured.")
                await browser.close()
                return
                
        elif platform == "linkedin":
            await page.goto("https://www.linkedin.com/login")
            print("\n*** ACTION REQUIRED ***")
            print("Please log in to LinkedIn in the browser window.")
            print("Ensure you complete any MFA/verification steps.")
            print("The script will capture the session as soon as you reach the feed page.\n")
            
            # Wait for feed share box trigger button
            try:
                await page.wait_for_selector('button.share-box-feed-entry__trigger', timeout=180000)
            except Exception as e:
                print("Timeout waiting for feed page. Session not captured.")
                await browser.close()
                return

        # Save session cookies and storage state
        await context.storage_state(path=session_file)
        print(f"\n[SUCCESS] Session state captured and saved to: {session_file}")
        await browser.close()

async def publish_post(platform: str, content: str):
    """
    Loads a saved session and posts content headlessly.
    """
    platform = platform.lower()
    session_file = os.path.join(SESSION_DIR, f"{platform}_state.json")
    
    if not os.path.exists(session_file):
        print(f"[ERROR] Session state not found at {session_file}.")
        print(f"Please run session capture first: python {sys.argv[0]} capture {platform}")
        return False

    print(f"Launching headless browser to post to {platform.upper()}...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        # Load persistent context
        context = await browser.new_context(
            storage_state=session_file,
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        if platform == "x":
            await page.goto("https://x.com/home")
            await page.wait_for_timeout(3000)
            
            post_input = page.locator('div[data-testid="tweetTextarea_0"]')
            if await post_input.count() == 0:
                print("[ERROR] Session invalid or expired. Please capture session again.")
                await browser.close()
                return False
                
            print("Typing tweet content...")
            await post_input.click()
            await post_input.fill(content)
            await page.wait_for_timeout(1000)
            
            print("Clicking Post button...")
            post_button = page.locator('button[data-testid="tweetButtonInline"]')
            await post_button.click()
            await page.wait_for_timeout(4000)
            print("[SUCCESS] Posted successfully to X/Twitter!")
            
        elif platform == "linkedin":
            await page.goto("https://www.linkedin.com/feed/")
            await page.wait_for_timeout(3000)
            
            share_trigger = page.locator("button.share-box-feed-entry__trigger")
            if await share_trigger.count() == 0:
                print("[ERROR] Session invalid or expired. Please capture session again.")
                await browser.close()
                return False
                
            print("Opening post creator...")
            await share_trigger.click()
            await page.wait_for_selector("div[role='textbox']")
            
            print("Typing post content...")
            editor = page.locator("div[role='textbox']")
            await editor.fill(content)
            await page.wait_for_timeout(1000)
            
            print("Clicking Post button...")
            post_btn = page.locator("button.share-actions__post-button")
            await post_btn.click()
            await page.wait_for_timeout(4000)
            print("[SUCCESS] Posted successfully to LinkedIn!")
            
        await browser.close()
        return True

async def main():
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Capture session: python social_media_browser_publisher.py capture [x|linkedin]")
        print("  Publish post:    python social_media_browser_publisher.py post [x|linkedin] \"Your post content\"")
        return
        
    action = sys.argv[1].lower()
    platform = sys.argv[2].lower()
    
    if action == "capture":
        await capture_session(platform)
    elif action == "post":
        if len(sys.argv) < 4:
            print("Please specify post content.")
            return
        content = sys.argv[3]
        await publish_post(platform, content)
    else:
        print(f"Unknown action: {action}")

if __name__ == "__main__":
    # If running on macOS, we configure selector loop policy for asyncio compatibility
    if sys.platform == "darwin":
        asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
    asyncio.run(main())
