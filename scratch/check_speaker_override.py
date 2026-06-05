from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:8502"

def test_speaker_override_voices():
    with sync_playwright() as p:
        # Launch browser headlessly
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))

        print(f"Navigating to {BASE_URL} to auto-authenticate...")
        page.goto(f"{BASE_URL}", wait_until="networkidle")
        page.wait_for_timeout(2000)

        print(f"Navigating to {BASE_URL}/podcasts...")
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

        print("Speaker Profile dialog opened successfully.")

        # Let's find the override selector for Speaker 1
        # The SelectTrigger has ID 'speaker-override-tts-0'
        override_trigger = dialog.locator("#speaker-override-tts-0").first
        print(f"Default override trigger text: '{override_trigger.text_content().strip()}'")

        # Let's check the voices before override (should show Kokoro voices by default)
        voice_picker_trigger = dialog.locator("button:has-text('Select a voice')").first
        
        print("\n--- Checking default voice picker options (should be Kokoro) ---")
        voice_picker_trigger.click()
        page.wait_for_timeout(1000)
        options = page.locator("[role='option'], [cmdk-item]").all()
        print(f"Found {len(options)} options before override. First few:")
        for opt in options[:5]:
            print(f"  - {opt.text_content().strip()}")
        
        # Verify it has Kokoro voice 'af_heart'
        has_af_heart = any("af_heart" in opt.text_content() for opt in options)
        print(f"Has 'af_heart' in options: {has_af_heart}")
        assert has_af_heart, "Expected Kokoro voices in default list"
        
        # Close popover
        voice_picker_trigger.click()
        page.wait_for_timeout(500)

        # 1. Change per-speaker override to OpenAI TTS
        print("\nChanging per-speaker override to OpenAI TTS...")
        override_trigger.click()
        page.wait_for_timeout(500)
        openai_option = page.locator("[role='option']:has-text('OpenAI TTS')").first
        openai_option.click()
        page.wait_for_timeout(1000)
        print(f"New override trigger text: '{override_trigger.text_content().strip()}'")

        # Check the voices again (should show OpenAI voices)
        print("\n--- Checking voice picker options after override to OpenAI ---")
        voice_picker_trigger.click()
        page.wait_for_timeout(1000)
        options = page.locator("[role='option'], [cmdk-item]").all()
        print(f"Found {len(options)} options after OpenAI override:")
        for opt in options:
            print(f"  - {opt.text_content().strip()}")
        
        # Verify it has OpenAI voice 'Alloy' or 'Ash'
        has_alloy = any("Alloy" in opt.text_content() for opt in options)
        print(f"Has 'Alloy' in options: {has_alloy}")
        assert has_alloy, "Expected OpenAI voices after OpenAI override"

        # Close popover
        voice_picker_trigger.click()
        page.wait_for_timeout(500)

        # 2. Change per-speaker override to Deepgram Aura
        print("\nChanging per-speaker override to Deepgram Aura...")
        override_trigger.click()
        page.wait_for_timeout(500)
        deepgram_option = page.locator("[role='option']:has-text('Deepgram Aura')").first
        deepgram_option.click()
        page.wait_for_timeout(1000)
        print(f"New override trigger text: '{override_trigger.text_content().strip()}'")

        # Check the voices again (should show Deepgram voices)
        print("\n--- Checking voice picker options after override to Deepgram ---")
        voice_picker_trigger.click()
        page.wait_for_timeout(1000)
        options = page.locator("[role='option'], [cmdk-item]").all()
        print(f"Found {len(options)} options after Deepgram override:")
        for opt in options:
            print(f"  - {opt.text_content().strip()}")
        
        # Verify it has Deepgram voice 'Luna' or 'Thalia'
        has_luna = any("Luna" in opt.text_content() for opt in options)
        print(f"Has 'Luna' in options: {has_luna}")
        assert has_luna, "Expected Deepgram voices after Deepgram override"

        # Close popover
        voice_picker_trigger.click()
        page.wait_for_timeout(500)

        print("\n✅ SUCCESS: Per-speaker TTS overrides dynamically update the Voice ID dropdown choices!")
        browser.close()

if __name__ == "__main__":
    test_speaker_override_voices()
