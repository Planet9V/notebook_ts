"""
Runtime availability probes for the opt-in heavy extraction engines.

Docling and local Crawl4AI are installed on demand at container startup, so availability
is a *runtime* property: it cannot be read off the enable flags, and it does not
survive a redeploy that drops them.

This lives in open_notebook.utils (not api/) because both layers need it: the
capabilities router reports it to the frontend, and the source-processing graph
must not hand content-core an engine whose runtime is absent.
"""

import importlib.util
import os
import sys

from loguru import logger


def docling_available() -> bool:
    """True when Docling is installed (its document engine, OCR and image sources work)."""
    try:
        from content_core.extraction import DOCLING_AVAILABLE

        return bool(DOCLING_AVAILABLE)
    except (ImportError, AttributeError):
        return importlib.util.find_spec("docling") is not None
    except Exception:
        logger.opt(exception=True).warning(
            "Unexpected error probing Docling availability; reporting unavailable"
        )
        return False


def crawl4ai_remote_configured() -> bool:
    """True when a remote Crawl4AI server is configured (CRAWL4AI_API_URL)."""
    try:
        from content_core.config import get_crawl4ai_api_url

        return bool(get_crawl4ai_api_url())
    except (ImportError, AttributeError):
        return bool(os.environ.get("CRAWL4AI_API_URL"))
    except Exception:
        logger.opt(exception=True).warning(
            "Unexpected error probing Crawl4AI remote config; falling back to env var"
        )
        return bool(os.environ.get("CRAWL4AI_API_URL"))


def _default_playwright_cache() -> str | None:
    """Playwright's default browser download directory when PLAYWRIGHT_BROWSERS_PATH is unset."""
    if sys.platform == "darwin":
        return os.path.expanduser("~/Library/Caches/ms-playwright")
    if sys.platform == "win32":
        local = os.environ.get("LOCALAPPDATA")
        return os.path.join(local, "ms-playwright") if local else None
    return os.path.expanduser("~/.cache/ms-playwright")


def _chromium_browser_present() -> bool:
    """True when a Playwright Chromium browser is installed on disk."""
    base = os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or _default_playwright_cache()
    if not base or not os.path.isdir(base):
        return False
    try:
        return any("chromium" in name for name in os.listdir(base))
    except OSError:
        return False


def crawl4ai_local_ready() -> bool:
    """True when local Crawl4AI can actually render: package installed + Chromium present."""
    if importlib.util.find_spec("crawl4ai") is None:
        return False
    return _chromium_browser_present()


def crawl4ai_available() -> bool:
    """True when Crawl4AI can run at all — locally installed or offloaded to a server."""
    return crawl4ai_local_ready() or crawl4ai_remote_configured()


_ENGINE_RUNTIMES: dict[str, tuple[str, str]] = {
    "crawl4ai": ("crawl4ai_available", "OPEN_NOTEBOOK_ENABLE_CRAWL4AI"),
    "docling": ("docling_available", "OPEN_NOTEBOOK_ENABLE_DOCLING"),
}


def engine_runtime_missing(engine: str | None) -> str | None:
    """Return the env var that would enable ``engine``, or None if it is usable."""
    if not engine:
        return None
    entry = _ENGINE_RUNTIMES.get(engine.strip().lower())
    if entry is None:
        return None
    probe_name, env_var = entry
    probe = globals()[probe_name]
    return None if probe() else env_var
