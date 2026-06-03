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
                b'data: {"citations": ["https://example.com/source1", "https://example.com/source2"], "choices": [{"delta": {"content": "Reasoning about "}}]}',
                b'data: {"choices": [{"delta": {"content": "security regulations."}}]}',
                b'data: [DONE]'
            ]
            for chunk in chunks:
                yield chunk

        mock_response.iter_lines = mock_iter_lines
        
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
