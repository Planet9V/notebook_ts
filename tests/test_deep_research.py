import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after environment variables have been configured."""
    from api.main import app

    return TestClient(app)


def is_live_valyu() -> bool:
    """Check if we have a real Valyu API key set in the environment."""
    return bool(os.environ.get("VALYU_API_KEY"))


class TestDeepResearchAPI:
    """Test suite for the Unified Deep Research endpoint."""

    @pytest.mark.asyncio
    async def test_perplexity_research_stream(self, client):
        """Test that perplexity research stream returns citations and content chunks correctly.
        
        Runs actual Valyu queries if API key is present; otherwise mocks the SDK client.
        """
        if is_live_valyu():
            # ── Live Mode ──
            response = client.post(
                "/api/search/research",
                json={
                    "query": "What is the capital of France?",
                    "engine": "perplexity"
                }
            )
            assert response.status_code == 200
            assert "text/plain" in response.headers["content-type"]

            # Read SSE stream and verify events
            lines = response.text.split("\n")
            events = []
            for line in lines:
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))

            # Verify we got status and complete events
            event_types = [e["type"] for e in events]
            assert "status" in event_types
            assert "complete" in event_types
            assert any(e["type"] == "answer" for e in events)
        else:
            # ── Mock Mode ──
            with patch("api.routers.search.Valyu") as mock_valyu_cls:
                mock_client = MagicMock()
                mock_valyu_cls.return_value = mock_client

                class MockAnswerChunk:
                    def __init__(self, chunk_type, **kwargs):
                        self.type = chunk_type
                        for k, v in kwargs.items():
                            setattr(self, k, v)

                mock_generator = [
                    MockAnswerChunk("search_results", search_results=[
                        MockAnswerChunk("source", title="Source 1", url="https://example.com/source1"),
                        MockAnswerChunk("source", title="Source 2", url="https://example.com/source2")
                    ]),
                    MockAnswerChunk("content", content="Reasoning about "),
                    MockAnswerChunk("content", content="security regulations."),
                ]
                mock_client.answer.return_value = mock_generator

                response = client.post(
                    "/api/search/research",
                    json={
                        "query": "What are the latest security regulations?",
                        "engine": "perplexity"
                    }
                )

                assert response.status_code == 200
                assert "text/plain" in response.headers["content-type"]

                lines = response.text.split("\n")
                events = []
                for line in lines:
                    if line.startswith("data: "):
                        events.append(json.loads(line[6:].strip()))

                assert len(events) >= 4
                assert events[0]["type"] == "status"
                assert events[1]["type"] == "sources"
                assert len(events[1]["content"]) == 2
                assert events[1]["content"][0]["url"] == "https://example.com/source1"
                assert events[2]["type"] == "answer"
                assert events[2]["content"] == "Reasoning about "
                assert events[3]["type"] == "answer"
                assert events[3]["content"] == "security regulations."

    @pytest.mark.asyncio
    @patch("open_notebook.domain.notebook.vector_search", new_callable=AsyncMock)
    @patch("open_notebook.ai.provision.provision_langchain_model", new_callable=AsyncMock)
    async def test_hybrid_research_stream(self, mock_provision, mock_vector, client):
        """Test that Hybrid deep research fetches from Local KB + Valyu, then synthesizes."""
        # Mock local KB vector search
        mock_vector.return_value = [
            {"title": "Local Note 1", "content": "NIST CSF requirements from local KB."}
        ]

        # Mock Langchain streaming model
        mock_llm = AsyncMock()
        async def mock_astream(payload):
            class Chunk:
                content = "Based on multi-engine search, "
            yield Chunk()
            class Chunk2:
                content = "directives require NIST compliance."
            yield Chunk2()

        mock_llm.astream = mock_astream
        mock_provision.return_value = mock_llm

        if is_live_valyu():
            # Execute endpoint call with real Valyu Search
            response = client.post(
                "/api/search/research",
                json={
                    "query": "Water sector directives",
                    "engine": "hybrid"
                }
            )
            assert response.status_code == 200
            assert "text/plain" in response.headers["content-type"]

            lines = response.text.split("\n")
            events = []
            for line in lines:
                if line.startswith("data: "):
                    events.append(json.loads(line[6:].strip()))

            event_types = [e["type"] for e in events]
            assert "status" in event_types
            assert "answer" in event_types
            assert "complete" in event_types
        else:
            # Mock the Valyu class inside open_notebook.search.valyu_search
            with patch("open_notebook.search.valyu_search.Valyu") as mock_valyu_cls:
                mock_client = MagicMock()
                mock_valyu_cls.return_value = mock_client

                class MockSearchEntry:
                    def __init__(self, title, url, content, score):
                        self.title = title
                        self.url = url
                        self.content = content
                        self.relevance_score = score

                class MockSearchResponse:
                    results = [
                        MockSearchEntry("Directives 101", "https://directives.gov/101", "NIST CSF requirements.", 0.9)
                    ]

                mock_client.search.return_value = MockSearchResponse()

                response = client.post(
                    "/api/search/research",
                    json={
                        "query": "Water sector directives",
                        "engine": "hybrid"
                    }
                )

                assert response.status_code == 200
                assert "text/plain" in response.headers["content-type"]

                lines = response.text.split("\n")
                events = []
                for line in lines:
                    if line.startswith("data: "):
                        events.append(json.loads(line[6:].strip()))

                event_types = [e["type"] for e in events]
                assert "status" in event_types
                assert "sources" in event_types
                assert "answer" in event_types
                assert "complete" in event_types

    def test_unsupported_engine_returns_error(self, client):
        """Test that an unsupported engine returns an error event."""
        response = client.post(
            "/api/search/research",
            json={
                "query": "test query",
                "engine": "nonexistent_engine"
            }
        )

        assert response.status_code == 200  # SSE always returns 200
        lines = response.text.split("\n")
        events = []
        for line in lines:
            if line.startswith("data: "):
                events.append(json.loads(line[6:].strip()))

        # Should contain an error event
        error_events = [e for e in events if e["type"] == "error"]
        assert len(error_events) >= 1
        assert "Unsupported" in error_events[0]["message"]


class TestResearchItemDeepResearch:
    """Integration tests for ResearchItem Deep Research workflow."""

    @pytest.mark.asyncio
    async def test_run_deep_research_workflow_success(self):
        """Test that a deep research workflow completes successfully."""
        from api.routers.research_items import background_run_research
        from open_notebook.domain.research_item import ResearchItem

        # Create a new ResearchItem in SurrealDB
        ri = ResearchItem(
            name="NIST CSF Deep Research Integration Test",
            query="What are the NIST CSF requirements? (quick)",
            is_deep_research=True,
            engines=["perplexity", "tavily"],
            save_as_source=True,
        )
        await ri.save()
        assert ri.id is not None

        try:
            if is_live_valyu():
                # ── Live Mode ──
                await background_run_research(ri.id)

                updated_ri = await ResearchItem.get(ri.id)
                assert updated_ri.stage == "review_enhance"
                assert len(updated_ri.results_content) > 0
                assert len(updated_ri.deep_research_events) > 0
            else:
                # ── Mock Mode ──
                mock_res = {
                    "output": "# NIST CSF Report\n\nNIST CSF provides guidelines [Source 1].\n\n## Bibliography\n- [Source 1]: http://example.com/source1",
                    "sources_used": [{"title": "Source 1", "url": "http://example.com/source1"}],
                    "mode": "standard",
                    "elapsed_seconds": 12.5,
                    "deepresearch_id": "mock_task_123"
                }
                with patch("api.routers.research_items.run_deep_research", new_callable=AsyncMock) as mock_run_dr:
                    mock_run_dr.return_value = mock_res

                    await background_run_research(ri.id)

                    updated_ri = await ResearchItem.get(ri.id)
                    assert updated_ri.stage == "review_enhance"
                    assert "NIST CSF Report" in updated_ri.results_content
                    assert "[Source 1]" in updated_ri.results_content
                    assert len(updated_ri.deep_research_events) >= 3
        finally:
            await ri.delete()

    @pytest.mark.asyncio
    async def test_run_deep_research_workflow_engine_failure_resilience(self):
        """Test that the workflow handles deep research execution successfully."""
        from api.routers.research_items import background_run_research
        from open_notebook.domain.research_item import ResearchItem

        ri = ResearchItem(
            name="Resilience Test",
            query="NIST CSF standards (fast)",
            is_deep_research=True,
            engines=["perplexity", "tavily"],
        )
        await ri.save()

        try:
            if is_live_valyu():
                # ── Live Mode ──
                await background_run_research(ri.id)

                updated_ri = await ResearchItem.get(ri.id)
                assert updated_ri.stage == "review_enhance"
                assert len(updated_ri.results_content) > 0
            else:
                # ── Mock Mode ──
                mock_res = {
                    "output": "# Final Report with citation [Source 1]\n\n## Sources\n- [Source 1]: http://perplexity.com",
                    "sources_used": [{"title": "Source 1", "url": "http://perplexity.com"}],
                    "mode": "standard",
                    "elapsed_seconds": 5.0,
                    "deepresearch_id": "mock_resilience"
                }
                with patch("api.routers.research_items.run_deep_research", new_callable=AsyncMock) as mock_run_dr:
                    mock_run_dr.return_value = mock_res

                    await background_run_research(ri.id)

                    updated_ri = await ResearchItem.get(ri.id)
                    assert updated_ri.stage == "review_enhance"
                    assert "Final Report with citation" in updated_ri.results_content
                    assert len(updated_ri.deep_research_events) >= 3
        finally:
            await ri.delete()

    @pytest.mark.asyncio
    @patch("api.routers.research_items.run_deep_research_workflow")
    async def test_run_deep_research_workflow_timeout(self, mock_workflow, client):
        """Test that a timeout in the deep research workflow is handled, stage is reset, and error is saved."""
        import asyncio
        from api.routers.research_items import background_run_research
        from open_notebook.domain.research_item import ResearchItem

        ri = ResearchItem(
            name="Timeout Test",
            query="What is the speed of light?",
            is_deep_research=True,
            engines=["perplexity"],
        )
        await ri.save()

        # Force timeout
        mock_workflow.side_effect = asyncio.TimeoutError()

        try:
            await background_run_research(ri.id)

            updated_ri = await ResearchItem.get(ri.id)
            assert updated_ri.stage == "queued"
            assert updated_ri.last_error is not None
            assert "timed out" in updated_ri.last_error.lower()

            events = updated_ri.deep_research_events
            assert len(events) > 0
            assert any("timed out" in e["message"].lower() for e in events)
        finally:
            await ri.delete()
