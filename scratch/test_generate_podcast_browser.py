from playwright.sync_api import sync_playwright
import sys
import os

BASE_URL = "http://localhost:8502"

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        # Monitor logs
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))
        
        # Capture network errors
        def log_response(response):
            if response.status >= 400:
                print(f"[API ERROR] {response.status} {response.url}")
        page.on("response", log_response)

        print(f"Navigating to {BASE_URL} to trigger auto-login...")
        page.goto(BASE_URL, wait_until="networkidle")
        page.wait_for_timeout(3000)
        print(f"Current URL: {page.url}")
        
        # Ensure we are logged in
        if "login" in page.url:
            print("ERROR: Did not auto-login to notebooks dashboard!")
            browser.close()
            sys.exit(1)

        print("Navigating to /podcasts...")
        page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
        page.wait_for_timeout(2000)
        print(f"Podcasts URL loaded: {page.url}")

        # Click the "Generate Podcast" button
        print("Clicking 'Generate Podcast' button...")
        gen_btn = page.locator("button:has-text('Generate Podcast')").first
        if not gen_btn.is_visible():
            print("ERROR: 'Generate Podcast' button is not visible!")
            browser.close()
            sys.exit(1)
        gen_btn.click()
        page.wait_for_timeout(1500)

        # Check if dialog is visible
        dialog = page.locator("[role='dialog']").first
        if not dialog.is_visible():
            print("ERROR: Generate Podcast dialog is not visible!")
            browser.close()
            sys.exit(1)
        print("Generate Podcast dialog opened successfully.")

        # Take initial dialog screenshot
        dialog.screenshot(path="/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_dialog_initial.png")
        print("Initial dialog screenshot saved.")

        # 1. Select Episode Profile
        print("Selecting episode profile 'solo_expert'...")
        profile_select = dialog.locator("#episode_profile").first
        profile_select.click()
        page.wait_for_timeout(500)
        # Select solo_expert option
        solo_opt = page.locator("[role='option']:has-text('solo_expert')").first
        solo_opt.click()
        page.wait_for_timeout(1000)

        # 2. Enter Episode Name
        print("Entering episode name 'UI Generation Test'...")
        name_input = dialog.locator("#episode_name").first
        name_input.fill("UI Generation Test")

        # 3. Check first notebook to add content/context
        print("Selecting first notebook checkbox...")
        notebook_checkbox = page.locator("[id^='notebook-toggle-']").first
        if notebook_checkbox.is_visible():
            notebook_checkbox.click()
            page.wait_for_timeout(1500)
        else:
            print("WARNING: No notebooks found to select context!")

        # 4. Override TTS Engine to Kokoro
        print("Overriding TTS Engine to Kokoro TTS...")
        tts_select_trigger = dialog.locator("button[role='combobox']").nth(1)
        print(f"TTS select trigger visible: {tts_select_trigger.is_visible()}, text: '{tts_select_trigger.inner_text()}'")
        tts_select_trigger.hover()
        tts_select_trigger.click(force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_dialog_tts_clicked.png")
        print("Dropdown clicked screenshot saved.")
        
        # Log all options currently in the DOM
        options = page.locator("[role='option']")
        print(f"Found {options.count()} options in DOM.")
        for i in range(options.count()):
            print(f"  Option {i}: '{options.nth(i).inner_text()}'")

        kokoro_opt = page.locator("[role='option']:has-text('Kokoro TTS')").first
        print(f"Kokoro option visible: {kokoro_opt.is_visible()}")
        kokoro_opt.hover()
        kokoro_opt.click(force=True)
        page.wait_for_timeout(1000)

        # 5. Map speaker 'Jim Mckenney' to 'Adam'
        print("Mapping voice for Jim Mckenney to Adam...")
        voice_picker = page.locator("div:has(span:has-text('Jim Mckenney')) button[role='combobox']").first
        print(f"Voice picker visible: {voice_picker.is_visible()}")
        if voice_picker.is_visible():
            voice_picker.hover()
            voice_picker.click(force=True)
            page.wait_for_timeout(1000)
            page.screenshot(path="/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_dialog_voice_clicked.png")
            
            voice_options = page.locator("[role='option']")
            print(f"Found {voice_options.count()} voice options in DOM.")
            for i in range(voice_options.count()):
                print(f"  Voice option {i}: '{voice_options.nth(i).inner_text()}'")
            
            adam_opt = page.locator("[role='option']:has-text('Adam')").first
            print(f"Adam voice option visible: {adam_opt.is_visible()}")
            adam_opt.hover()
            adam_opt.click(force=True)
            page.wait_for_timeout(1000)
        else:
            print("WARNING: Voice mapping trigger for Jim Mckenney not visible!")

        # Take filled dialog screenshot
        dialog.screenshot(path="/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_dialog_filled.png")
        print("Filled dialog screenshot saved.")

        # 6. Click Generate button inside dialog
        print("Clicking Generate submit button...")
        # Submit button is the primary blue one inside the dialog flex-col gap-3 container
        submit_btn = dialog.locator("button:has-text('Generate')").first
        submit_btn.click()
        print("Form submitted. Waiting for dialog to close...")
        page.wait_for_timeout(3000)

        # 7. Check that the episode is added to the ledger and shown as processing
        print("Refreshing podcast list...")
        page.reload()
        page.wait_for_timeout(3000)

        # Take page screenshot to check processing list
        page.screenshot(path="/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7/podcast_page_after_submission.png")
        print("Screenshot after submission saved.")

        # Verify new episode exists in processing list
        new_episode_card = page.locator("div:has-text('UI Generation Test')").first
        if new_episode_card.is_visible():
            print("✅ SUCCESS: 'UI Generation Test' is visible and currently generating!")
            browser.close()
            sys.exit(0)
        else:
            print("❌ FAILURE: 'UI Generation Test' was not found in the episode list after submission!")
            browser.close()
            sys.exit(1)

if __name__ == "__main__":
    run_test()
