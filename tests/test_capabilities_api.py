"""
Tests for GET /api/capabilities (api/routers/capabilities.py).
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from api.main import app

    return TestClient(app)


def _patch_probes(monkeypatch, *, docling, crawl4ai_local, crawl4ai_remote):
    monkeypatch.setattr(
        "api.routers.capabilities.docling_available", lambda: docling
    )
    monkeypatch.setattr(
        "api.routers.capabilities.crawl4ai_remote_configured",
        lambda: crawl4ai_remote,
    )
    monkeypatch.setattr(
        "api.routers.capabilities.crawl4ai_local_ready", lambda: crawl4ai_local
    )


class TestCapabilitiesEndpoint:
    def test_all_unavailable(self, client, monkeypatch):
        _patch_probes(
            monkeypatch, docling=False, crawl4ai_local=False, crawl4ai_remote=False
        )
        response = client.get("/api/capabilities")
        assert response.status_code == 200
        assert response.json() == {
            "docling_available": False,
            "crawl4ai_available": False,
            "crawl4ai_remote_configured": False,
        }

    def test_docling_available_is_independent_of_crawl4ai(self, client, monkeypatch):
        _patch_probes(
            monkeypatch, docling=True, crawl4ai_local=False, crawl4ai_remote=False
        )
        body = client.get("/api/capabilities").json()
        assert body["docling_available"] is True
        assert body["crawl4ai_available"] is False

    def test_local_crawl4ai_makes_it_available(self, client, monkeypatch):
        _patch_probes(
            monkeypatch, docling=False, crawl4ai_local=True, crawl4ai_remote=False
        )
        body = client.get("/api/capabilities").json()
        assert body["crawl4ai_available"] is True
        assert body["crawl4ai_remote_configured"] is False

    def test_remote_crawl4ai_makes_it_available_without_local(
        self, client, monkeypatch
    ):
        _patch_probes(
            monkeypatch, docling=False, crawl4ai_local=False, crawl4ai_remote=True
        )
        body = client.get("/api/capabilities").json()
        assert body["crawl4ai_available"] is True
        assert body["crawl4ai_remote_configured"] is True


class TestCrawl4aiLocalReadiness:
    """Local Crawl4AI needs the package AND a Chromium browser on disk."""

    def test_not_ready_when_package_missing(self, monkeypatch):
        import open_notebook.utils.runtime_capabilities as cap

        monkeypatch.setattr(
            cap.importlib.util, "find_spec", lambda name, *a, **k: None
        )
        assert cap.crawl4ai_local_ready() is False

    def test_not_ready_when_browser_missing(self, monkeypatch, tmp_path):
        import open_notebook.utils.runtime_capabilities as cap

        monkeypatch.setattr(
            cap.importlib.util, "find_spec", lambda name, *a, **k: object()
        )
        monkeypatch.setenv("PLAYWRIGHT_BROWSERS_PATH", str(tmp_path))
        assert cap.crawl4ai_local_ready() is False

    def test_ready_when_browser_present(self, monkeypatch, tmp_path):
        import open_notebook.utils.runtime_capabilities as cap

        monkeypatch.setattr(
            cap.importlib.util, "find_spec", lambda name, *a, **k: object()
        )
        (tmp_path / "chromium-1140").mkdir()
        monkeypatch.setenv("PLAYWRIGHT_BROWSERS_PATH", str(tmp_path))
        assert cap.crawl4ai_local_ready() is True
