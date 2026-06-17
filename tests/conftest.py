"""
Pytest configuration file.

This file ensures that the project root is in the Python path,
allowing tests to import from the api and open_notebook modules.
"""

import os
import sys
import pytest
from pathlib import Path

# Ensure password auth is disabled for tests BEFORE any imports
# The PasswordAuthMiddleware skips auth when this env var is not set
# Set to empty string instead of deleting to prevent it from being reloaded
os.environ["OPEN_NOTEBOOK_PASSWORD"] = ""

# Load environment variables from .env file
# This must be done BEFORE any imports that depend on environment variables
from dotenv import load_dotenv

# Load .env file from project root
dotenv_path = Path(__file__).parent.parent / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)
    print(f"Loaded environment variables from {dotenv_path}")
else:
    print(f"Warning: .env file not found at {dotenv_path}")

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def pytest_addoption(parser: pytest.Parser) -> None:
    """Add --run-e2e flag to enable Playwright/browser E2E tests."""
    parser.addoption(
        "--run-e2e",
        action="store_true",
        default=False,
        help="Run Playwright E2E tests (requires `playwright install` and a browser)",
    )


def pytest_collection_modifyitems(
    config: pytest.Config, items: list[pytest.Item]
) -> None:
    """Skip E2E tests unless --run-e2e is passed."""
    if config.getoption("--run-e2e"):
        return  # user explicitly wants E2E — run everything

    skip_e2e = pytest.mark.skip(
        reason="Playwright E2E test — pass --run-e2e to run (requires browser)"
    )
    e2e_files = {"test_loom_mockup", "test_bento_mockup", "test_bento_enhancements", "test_e2e_visual"}
    for item in items:
        # item.nodeid looks like "tests/test_loom_mockup.py::test_foo"
        module_name = item.nodeid.split("/")[-1].split(".")[0]
        if module_name in e2e_files:
            item.add_marker(skip_e2e)


# Skip E2E Playwright test FILES from collection when playwright is not installed
# (still needed so conftest itself doesn't error on import)
try:
    import playwright  # noqa: F401
    _playwright_installed = True
except ImportError:
    _playwright_installed = False
    collect_ignore = [
        "test_bento_enhancements.py",
        "test_bento_mockup.py",
        "test_loom_mockup.py",
    ]

