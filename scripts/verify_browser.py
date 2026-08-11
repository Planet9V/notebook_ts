#!/usr/bin/env python3
"""
Browser verification script for Tetrel Notebook.
Captures screenshots of key pages to confirm the app is running correctly.
Usage: .venv/bin/python scripts/verify_browser.py
"""
import os
import sys
from pathlib import Path

SCREENSHOTS_DIR = Path("/tmp/tetrel_verify")
SCREENSHOTS_DIR.mkdir(exist_ok=True)

BASE_URL = "http://localhost:8502"

PAGES = [
    ("home",     "/",                         "Landing page"),
    ("search",   "/search",                   "Search page"),
    ("voice",    "/settings?tab=voice",       "Voice settings"),
    ("media",    "/media",                    "Media / Social Creator"),
]

from playwright.sync_api import sync_playwright


def verify():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        for name, path, label in PAGES:
            url = f"{BASE_URL}{path}"
            screenshot = SCREENSHOTS_DIR / f"{name}.png"
            try:
                page.goto(url, timeout=15000)
                page.wait_for_load_state("networkidle", timeout=10000)
                page.screenshot(path=str(screenshot), full_page=False)
                title = page.title()
                results.append((name, "PASS", title, str(screenshot)))
                print(f"✅ {label}: {title} → {screenshot}")
            except Exception as e:
                results.append((name, "FAIL", str(e), ""))
                print(f"❌ {label}: {e}")

        browser.close()

    failures = [r for r in results if r[1] == "FAIL"]
    print(f"\n{'='*50}")
    print(f"Results: {len(results) - len(failures)}/{len(results)} pages verified")
    print(f"Screenshots: {SCREENSHOTS_DIR}")
    return len(failures) == 0

if __name__ == "__main__":
    ok = verify()
    sys.exit(0 if ok else 1)
