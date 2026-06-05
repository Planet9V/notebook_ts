import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after environment variables have been configured."""
    from api.main import app

    return TestClient(app)


class TestDeepResearchAPI:
    """Test suite for the Unified Deep Research endpoint."""

    @pytest.mark.asyncio
    @patch("open_notebook.ai.key_provider.get_api_key", new_callable=AsyncMock)
    @patch("httpx.AsyncClient.stream")
    async def test_perplexity_research_stream(self, mock_stream, mock_get_api_key, client):
        """Test that perplexity research stream returns citations and content chunks correctly."""
        # Setup mocks
        mock_get_api_key.return_value = "fake-perplexity-key"

        # Mock chunk streaming response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        # Generator for chunk lines
        async def mock_iter_lines():
            # SSE chunks simulating Perplexity API output
            chunks = [
                'data: {"citations": ["https://example.com/source1", "https://example.com/source2"], "choices": [{"delta": {"content": "Reasoning about "}}]}',
                'data: {"choices": [{"delta": {"content": "security regulations."}}]}',
                'data: [DONE]'
            ]
            for chunk in chunks:
                yield chunk

        mock_response.aiter_lines = mock_iter_lines
        
        # Async context manager mock for stream
        class MockStreamContext:
            async def __aenter__(self):
                return mock_response
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
                
        mock_stream.return_value = MockStreamContext()

        # Execute endpoint call
        response = client.post(
            "/api/search/research",
            json={
                "query": "What are the latest security regulations?",
                "engine": "perplexity"
            }
        )

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]

        # Parse SSE lines from response
        lines = response.text.split("\n")
        events = []
        for line in lines:
            if line.startswith("data: "):
                events.append(json.loads(line[6:].strip()))

        # Verify stream events structure
        assert len(events) >= 4
        # Event 1: Initializing status
        assert events[0]["type"] == "status"
        # Event 2: Sources/Citations extracted
        assert events[1]["type"] == "sources"
        assert len(events[1]["content"]) == 2
        assert events[1]["content"][0]["url"] == "https://example.com/source1"
        # Event 3: Text Content chunk
        assert events[2]["type"] == "answer"
        assert events[2]["content"] == "Reasoning about "
        # Event 4: Text Content chunk
        assert events[3]["type"] == "answer"
        assert events[3]["content"] == "security regulations."

    @pytest.mark.asyncio
    @patch("open_notebook.ai.key_provider.get_api_key", new_callable=AsyncMock)
    @patch("httpx.AsyncClient.post", new_callable=AsyncMock)
    @patch("open_notebook.domain.notebook.vector_search", new_callable=AsyncMock)
    @patch("open_notebook.ai.provision.provision_langchain_model", new_callable=AsyncMock)
    async def test_hybrid_research_stream(self, mock_provision, mock_vector, mock_post, mock_get_api_key, client):
        """Test that Hybrid deep research fetches from Local KB + Perplexity + Valyu, then synthesizes."""
        # Setup mocks — get_api_key is called for both perplexity and valyu
        mock_get_api_key.return_value = "fake-key"

        # Mock local KB vector search
        mock_vector.return_value = [
            {"title": "Local Note 1", "content": "NIST CSF requirements from local KB."}
        ]

        # Mock Perplexity (non-streaming) and Valyu responses
        mock_perplexity_resp = MagicMock()
        mock_perplexity_resp.status_code = 200
        mock_perplexity_resp.json.return_value = {
            "choices": [{"message": {"content": "Perplexity analysis of directives."}}],
            "citations": ["https://perplexity.example.com/cite1"]
        }

        mock_valyu_resp = MagicMock()
        mock_valyu_resp.status_code = 200
        mock_valyu_resp.json.return_value = {
            "success": True,
            "results": [
                {"title": "Directives 101", "url": "https://directives.gov/101", "content": "NIST CSF requirements."}
            ]
        }

        # post() is called twice: once for perplexity, once for valyu
        mock_post.side_effect = [mock_perplexity_resp, mock_valyu_resp]

        # Mock Langchain streaming model
        mock_llm = AsyncMock()
        
        # Stream chunks generator
        async def mock_astream(payload):
            class Chunk:
                content = "Based on multi-engine search, "
            yield Chunk()
            class Chunk2:
                content = "directives require NIST compliance."
            yield Chunk2()

        mock_llm.astream = mock_astream
        mock_provision.return_value = mock_llm

        # Execute endpoint call
        response = client.post(
            "/api/search/research",
            json={
                "query": "Water sector directives",
                "engine": "hybrid"
            }
        )

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]

        # Parse SSE lines
        lines = response.text.split("\n")
        events = []
        for line in lines:
            if line.startswith("data: "):
                events.append(json.loads(line[6:].strip()))

        # Verify we got status + sources + answer events
        event_types = [e["type"] for e in events]
        assert "status" in event_types, f"Expected 'status' in event types, got: {event_types}"
        assert "sources" in event_types, f"Expected 'sources' in event types, got: {event_types}"
        assert "answer" in event_types, f"Expected 'answer' in event types, got: {event_types}"
        assert "complete" in event_types, f"Expected 'complete' in event types, got: {event_types}"

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
    """Integration tests for ResearchItem Deep Research workflow and multi-engine inter-weaving."""

    @pytest.mark.asyncio
    @patch("open_notebook.ai.provision.provision_langchain_model")
    @patch("open_notebook.domain.scheduled_search_worker._run_search")
    async def test_run_deep_research_workflow_success(self, mock_run_search, mock_provision_llm):
        """Test that a deep research workflow completes successfully through all 5 stages."""
        from api.routers.research_items import background_run_research
        from open_notebook.domain.research_item import ResearchItem

        # Create a new ResearchItem in SurrealDB
        ri = ResearchItem(
            name="NIST CSF Deep Research Integration Test",
            query="What are the NIST CSF requirements?",
            is_deep_research=True,
            engines=["perplexity", "tavily"],
            save_as_source=True,
        )
        await ri.save()
        assert ri.id is not None

        # Setup mock Langchain model responses
        mock_llm = AsyncMock()
        mock_clarification = MagicMock(content="Clarification: Defining NIST CSF goals.")
        mock_plan = MagicMock(content="Plan: 1. Fetch NIST details, 2. Synthesize.")
        mock_queries = MagicMock(content="NIST CSF requirements\nNIST CSF security controls")
        mock_synthesis = MagicMock(content="Synthesis: NIST CSF has core components.")
        mock_report = MagicMock(content="# NIST CSF Report\n\nNIST CSF provides guidelines [Source 1].\n\n## Bibliography\n- [Source 1]: http://example.com/source1")
        
        mock_llm.ainvoke.side_effect = [
            mock_clarification,
            mock_plan,
            mock_queries,
            mock_synthesis,
            mock_report
        ]
        mock_provision_llm.return_value = mock_llm

        # Setup mock search responses
        mock_run_search.return_value = [
            {"title": "Source 1", "url": "http://example.com/source1", "content": "NIST CSF requirements are guidelines."}
        ]

        try:
            # Execute background research runner
            await background_run_research(ri.id)

            # Retrieve from database and verify state transitions and event logging
            updated_ri = await ResearchItem.get(ri.id)
            assert updated_ri.stage == "review_enhance"
            assert "NIST CSF Report" in updated_ri.results_content
            assert "[Source 1]" in updated_ri.results_content

            events = updated_ri.deep_research_events
            assert len(events) >= 5
            
            stages = [e["stage"] for e in events]
            assert "clarifying" in stages
            assert "planning" in stages
            assert "gathering" in stages
            assert "synthesizing" in stages
            assert "reporting" in stages
            assert "completed" in stages

            # Verify bibliography in the content
            assert "http://example.com/source1" in updated_ri.results_content
        finally:
            await ri.delete()

    @pytest.mark.asyncio
    @patch("open_notebook.ai.provision.provision_langchain_model")
    @patch("open_notebook.domain.scheduled_search_worker._run_search")
    async def test_run_deep_research_workflow_engine_failure_resilience(self, mock_run_search, mock_provision_llm):
        """Test that if one search engine fails, the gathering step continues and completes successfully."""
        from api.routers.research_items import background_run_research
        from open_notebook.domain.research_item import ResearchItem

        ri = ResearchItem(
            name="Resilience Test",
            query="NIST CSF standards",
            is_deep_research=True,
            engines=["perplexity", "tavily"],
        )
        await ri.save()

        # Mock LLM
        mock_llm = AsyncMock()
        mock_llm.ainvoke.side_effect = [
            MagicMock(content="Clarification of NIST CSF standards"),
            MagicMock(content="Research Plan"),
            MagicMock(content="NIST CSF queries"),
            MagicMock(content="Synthesis of results"),
            MagicMock(content="# Final Report with citation [Source 1]\n\n## Sources\n- [Source 1]: http://perplexity.com")
        ]
        mock_provision_llm.return_value = mock_llm

        # Mock search results: perplexity succeeds, tavily raises exception
        async def side_effect_search(engine, query):
            if engine == "perplexity":
                return [{"title": "Perplexity result", "url": "http://perplexity.com", "content": "NIST CSF controls"}]
            else:
                raise Exception("Tavily search failed connection error")

        mock_run_search.side_effect = side_effect_search

        try:
            await background_run_research(ri.id)

            updated_ri = await ResearchItem.get(ri.id)
            assert updated_ri.stage == "review_enhance"
            assert "Final Report with citation" in updated_ri.results_content
            
            # Events should log success of gathering stage
            events = updated_ri.deep_research_events
            stages = [e["stage"] for e in events]
            assert "gathering" in stages
            assert "completed" in stages
        finally:
            await ri.delete()

    @pytest.mark.asyncio
    @patch("api.routers.research_items.run_deep_research_workflow")
    async def test_run_deep_research_workflow_timeout(self, mock_workflow):
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
            # stage should be queued when mark_failure is called
            assert updated_ri.stage == "queued"
            assert updated_ri.last_error is not None
            assert "timed out" in updated_ri.last_error.lower()

            # Verify event log contains timeout event
            events = updated_ri.deep_research_events
            assert len(events) > 0
            assert any("timed out" in e["message"].lower() for e in events)
        finally:
            await ri.delete()

