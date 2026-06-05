from playwright.sync_api import sync_playwright
import sys

BASE_URL = "http://localhost:3000"

def test_dynamic_voices():
    with sync_playwright() as p:
        # Launch browser headlessly
        browser = p.chromium.launch(headless=True)
        # Capture console messages
        page = browser.new_page()
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))

        print(f"Navigating to {BASE_URL} to auto-authenticate...")
        page.goto(f"{BASE_URL}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        print(f"Current URL after auth: {page.url}")

        print(f"Navigating to {BASE_URL}/podcasts...")
        page.goto(f"{BASE_URL}/podcasts", wait_until="networkidle")
        page.wait_for_timeout(2000)
        print(f"Current URL: {page.url}")

        # Click on Templates tab
        print("Clicking Templates tab...")
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
            return

        print("Speaker Profile dialog opened successfully.")

        # Let's inspect the default TTS System value
        # The select trigger has ID voice_model or similar
        tts_trigger = dialog.locator("#voice_model").first
        print(f"Default TTS System value: '{tts_trigger.text_content().strip()}'")

        # Let's find the speaker voice combobox (should be inside VoiceIdPicker)
        voice_cbs = dialog.locator("[role='combobox']").all()
        print(f"Found {len(voice_cbs)} comboboxes inside dialog.")
        
        # Helper to print available voices in the popover
        def print_available_voices(engine_name):
            print(f"\n--- Checking voices for {engine_name} ---")
            # First, click the voice ID picker (which is the SearchableModelSelect trigger)
            # Typically it is the second combobox or inside VoiceIdPicker
            voice_cb = None
            for cb in voice_cbs:
                text = cb.text_content().strip().lower()
                # Exclude the LLM model selector or TTS selector triggers if any
                if "select a voice" in text or any(v in text for v in ["alloy", "ash", "af_heart", "rachel", "thalia"]):
                    voice_cb = cb
                    break
            
            if not voice_cb:
                # Fallback: it might just say "Select a voice" or the active voice name
                # Let's check all comboboxes that aren't the main tts_trigger
                for cb in voice_cbs:
                    if cb != tts_trigger:
                        voice_cb = cb
                        break
            
            if not voice_cb:
                print("ERROR: Could not find Voice ID combobox!")
                return

            print(f"Clicking Voice ID picker (current text: '{voice_cb.text_content().strip()}')")
            voice_cb.click(force=True)
            page.wait_for_timeout(1000)

            # Look for options in the portal/popover
            # SearchableModelSelect uses cmdk-item or role="option"
            options = page.locator("[role='option'], [cmdk-item]").all()
            print(f"Found {len(options)} options in voice list:")
            for opt in options:
                print(f"  - {opt.text_content().strip()}")
            
            # Close the popover by clicking the trigger again
            voice_cb.click(force=True)
            page.wait_for_timeout(500)

        # 1. Print default (Kokoro)
        print_available_voices("Default (Kokoro)")

        # 2. Change TTS System to OpenAI
        print("\nChanging TTS System to OpenAI...")
        tts_trigger.click()
        page.wait_for_timeout(500)
        # Select the OpenAI option
        openai_option = page.locator("[role='option']:has-text('OpenAI'), [role='option']:has-text('OpenAI TTS')").first
        openai_option.click()
        page.wait_for_timeout(1000)
        print(f"New TTS System value: '{tts_trigger.text_content().strip()}'")

        # Print OpenAI voices
        print_available_voices("OpenAI")

        # 3. Change TTS System to Deepgram
        print("\nChanging TTS System to Deepgram Aura...")
        tts_trigger.click()
        page.wait_for_timeout(500)
        deepgram_option = page.locator("[role='option']:has-text('Deepgram')").first
        deepgram_option.click()
        page.wait_for_timeout(1000)
        print(f"New TTS System value: '{tts_trigger.text_content().strip()}'")

        # Print Deepgram voices
        print_available_voices("Deepgram")

        browser.close()

if __name__ == "__main__":
    test_dynamic_voices()
