from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:8502"

def test_select_voice():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))

        print(f"Navigating to {BASE_URL}...")
        page.goto(f"{BASE_URL}", wait_until="networkidle")
        page.wait_for_timeout(2000)

        print("Navigating to /podcasts...")
        page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Click on Profiles tab
        print("Clicking Profiles tab...")
        templates_btn = page.locator("button:has-text('Profiles')").first
        templates_btn.click()
        page.wait_for_timeout(1000)

        # Click "Create Speaker"
        print("Clicking Create Speaker button...")
        create_btn = page.locator("button:has-text('Create Speaker')").first
        create_btn.click()
        page.wait_for_timeout(1000)

        # Check if dialog is visible
        dialog = page.locator("[role='dialog']").first
        if not dialog.is_visible():
            print("ERROR: Speaker Profile dialog is not visible!")
            browser.close()
            sys.exit(1)

        # Change Speaker 1 override to OpenAI TTS
        print("\nChanging Speaker 1 override to OpenAI TTS...")
        override_trigger = dialog.locator("#speaker-override-tts-0").first
        override_trigger.click()
        page.wait_for_timeout(500)
        openai_option = page.locator("[role='option']:has-text('OpenAI TTS')").first
        openai_option.click()
        page.wait_for_timeout(1000)

        # Click Voice ID dropdown
        voice_picker_trigger = dialog.locator("div:has(> label:has-text('Voice ID')) button").first
        print(f"Clicking Voice ID dropdown (current text: '{voice_picker_trigger.text_content().strip()}')")
        voice_picker_trigger.click()
        page.wait_for_timeout(1000)

        # Click on "Ash" option
        print("Clicking 'Ash' option...")
        ash_option = page.locator("[role='option']:has-text('Ash'), [cmdk-item]:has-text('Ash')").first
        if not ash_option.is_visible():
            print("ERROR: 'Ash' option is not visible!")
            browser.close()
            sys.exit(1)

        ash_option.click()
        page.wait_for_timeout(1000)

        # Verify that the Voice ID picker trigger now displays "Ash"
        current_text = voice_picker_trigger.text_content().strip()
        print(f"Voice ID dropdown text after selection: '{current_text}'")

        if "Ash" in current_text:
            print("✅ SUCCESS: Successfully selected the voice 'Ash' from the dynamic list!")
            browser.close()
            sys.exit(0)
        else:
            print("❌ FAILURE: Voice ID dropdown text did not update to 'Ash'!")
            browser.close()
            sys.exit(1)

if __name__ == "__main__":
    test_select_voice()
