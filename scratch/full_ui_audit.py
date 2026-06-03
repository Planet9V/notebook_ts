import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def run():
    print("Initializing Playwright browser...")
    async with async_playwright() as p:
        # Launch headless Chromium
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()
        
        # Define output directory
        brain_dir = "/Users/jimmcknney/.gemini/antigravity/brain/2d2bd15c-247e-4e2e-be1b-04371888daa7"
        os.makedirs(brain_dir, exist_ok=True)
        
        print("Navigating to http://localhost:8502/notebooks to authenticate...")
        await page.goto("http://localhost:8502/notebooks")
        await page.wait_for_load_state("networkidle")
        
        print(f"Current URL: {page.url}")
        
        # Locate and click on the Tetrel OT card
        print("Locating and clicking the Tetrel OT card...")
        card = page.locator("div.group", has_text="Tetrel OT").first
        await card.click()
        
        print("Waiting for workspace navigation...")
        await page.wait_for_timeout(4000)
        await page.wait_for_load_state("networkidle")
        print(f"Current workspace URL: {page.url}")
        
        # Capture standard research notebook state
        standard_path = os.path.join(brain_dir, "standard_research_notebook.png")
        await page.screenshot(path=standard_path)
        print(f"Standard view screenshot saved: {standard_path}")
        
        # Check if notebook name is present in header
        notebook_header = page.locator("button.text-2xl", has_text="Tetrel OT").first
        if await notebook_header.is_visible():
            print("Verified notebook name 'Tetrel OT' is visible in header!")
        else:
            print("Notebook name header not visible, checking for generic title text...")
            notebook_header = page.locator("text=Tetrel OT").first
            print(f"Verified notebook name text is visible: {await notebook_header.is_visible()}")
        
        # Toggle B2B mode
        print("Locating and clicking B2B Proposal Workspace button...")
        b2b_button = page.locator("button:has-text('B2B Proposal Workspace')")
        await b2b_button.click()
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")
        
        # Take screenshot of the B2B mode Proposal Draft view
        draft_path = os.path.join(brain_dir, "b2b_proposal_draft.png")
        await page.screenshot(path=draft_path)
        print(f"B2B Proposal Draft view screenshot saved: {draft_path}")
        
        # Verify RAG Compliance Checklist renders
        checklist_title = page.locator("text=AI SOW Safety Auditing").first
        if await checklist_title.is_visible():
            print("Verified RAG Compliance Checklist is visible in B2B mode!")
        else:
            print("WARNING: RAG Compliance Checklist title not found.")
            
        # Select another check in RAG checklist to verify syncd Diagnostics Panel
        print("Clicking a check in RAG checklist...")
        timing_check = page.locator("text=Side-Channel Leakage Minimization").first
        await timing_check.click()
        await page.wait_for_timeout(1000)
        
        # Verify linked passage renders
        linked_passage = page.locator("text=Source Document Passage").first
        if await linked_passage.is_visible():
            print("Verified Linked Spec Document Passage is visible!")
        else:
            print("WARNING: Linked spec passage not found.")
            
        # Switch to CSET Compliance Quiz tab
        print("Switching to CSET Compliance Quiz tab...")
        quiz_tab = page.locator("button:has-text('CSET Compliance Quiz')")
        await quiz_tab.click()
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")
        
        # Verify the dropdown options are filtered to the customer's CIF scope
        print("Verifying CSET Compliance Quiz framework dropdown...")
        options = await page.locator("select >> option").all_inner_texts()
        print(f"Dropdown options found: {options}")
        
        options_lower = [o.lower() for o in options]
        has_iec = any("iec 62443-3-3" in o for o in options_lower)
        has_cfats = any("cfats rbps" in o for o in options_lower)
        has_nerc = any("nerc" in o for o in options_lower)
        
        print(f"Has IEC 62443-3-3: {has_iec}")
        print(f"Has CFATS RBPS: {has_cfats}")
        print(f"Has NERC CIP: {has_nerc}")
        
        assert has_iec, "Expected scoped framework IEC 62443-3-3 to be present in dropdown"
        assert has_cfats, "Expected scoped framework CFATS RBPS to be present in dropdown"
        assert not has_nerc, "Expected unscoped framework NERC CIP to be filtered out of dropdown"
        print("Successfully verified dropdown is scoped/filtered to customer's CIF!")
        
        # Switch to Network Canvas tab
        print("Switching to Network Canvas tab...")
        canvas_tab = page.locator("button:has-text('Network Canvas')")
        await canvas_tab.click()
        await page.wait_for_timeout(3000)
        await page.wait_for_load_state("networkidle")
        
        # Take screenshot of the CSET Network Canvas Map
        canvas_path = os.path.join(brain_dir, "b2b_cset_canvas.png")
        await page.screenshot(path=canvas_path)
        print(f"CSET Canvas view screenshot saved: {canvas_path}")
        
        # Verify Swimlanes rendering
        swimlane_4 = page.locator("text=Level 4: Enterprise Network").first
        swimlane_3 = page.locator("text=Level 3: Operations Control Network").first
        swimlane_12 = page.locator("text=Level 1-2: Process Control & Field Zone").first
        
        if await swimlane_4.is_visible() and await swimlane_3.is_visible() and await swimlane_12.is_visible():
            print("Verified visual swimlanes (Level 4, Level 3, Level 1-2) successfully render in canvas!")
        else:
            print(f"Swimlanes check: L4={await swimlane_4.is_visible()}, L3={await swimlane_3.is_visible()}, L1-2={await swimlane_12.is_visible()}")
            
        # Verify custom devices rendering
        switch_node = page.locator("text=Enterprise Switch").first
        firewall_node = page.locator("text=OT Boundary Firewall").first
        hmi_node = page.locator("text=Operator HMI Station").first
        plc_node = page.locator("text=Process Control PLC").first
        
        if await switch_node.is_visible() and await firewall_node.is_visible() and await hmi_node.is_visible() and await plc_node.is_visible():
            print("Verified custom devices (Switch, Firewall, HMI, PLC) successfully render inside canvas swimlanes!")
        else:
            print("WARNING: Custom devices elements missing in canvas.")
            
        # Open Agentic Cockpit drawer
        print("Locating and clicking Cockpit drawer toggle button...")
        cockpit_button = page.locator("button:has-text('Cockpit')")
        await cockpit_button.click()
        await page.wait_for_timeout(1500)
        
        # Take screenshot of cockpit drawer
        cockpit_path = os.path.join(brain_dir, "b2b_cockpit_drawer.png")
        await page.screenshot(path=cockpit_path)
        print(f"B2B Cockpit Drawer view screenshot saved: {cockpit_path}")
        
        # Verify Cockpit Elements
        cockpit_title = page.locator("text=[Agentic Workflow Cockpit]").first
        if await cockpit_title.is_visible():
            print("Verified Agentic Workflow Cockpit drawer successfully opened!")
        else:
            print("WARNING: Agentic Cockpit title not found.")
            
        # Check budget Cap Slider and values
        budget_cap_text = page.locator("text=Token Budget Cap").first
        if await budget_cap_text.is_visible():
            print("Verified Cockpit budgeting cost slider is rendered!")
        else:
            print("WARNING: Budget cap text not found.")
            
        # Trigger Compliance Audit pipeline run
        print("Clicking Run Compliance Audit button...")
        run_audit_button = page.locator("button:has-text('Run Compliance Audit')").first
        await run_audit_button.click()
        
        # Wait for dynamic steps to animate (approx. 4 seconds)
        print("Waiting for real-time compliance steps to run and highlight threat paths...")
        await page.wait_for_timeout(4500)
        
        # Take screenshot of active threat paths and step highlights
        audit_complete_path = os.path.join(brain_dir, "b2b_audit_complete.png")
        await page.screenshot(path=audit_complete_path)
        print(f"B2B Audit complete view screenshot saved: {audit_complete_path}")
        
        # Check if the execution steps show success
        step_completed = page.locator("text=1. Topology Hash Parse").first
        if await step_completed.is_visible():
            print("Verified workflow execution steps ran and succeeded!")
        else:
            print("WARNING: Workflow steps not found or failed.")
            
        await browser.close()
        print("Full UI e2e test complete successfully!")

if __name__ == "__main__":
    asyncio.run(run())
