from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.asyncio
@patch("open_notebook.utils.embedding.generate_embedding", new_callable=AsyncMock)
@patch("open_notebook.ai.models.model_manager.get_default_model", new_callable=AsyncMock)
async def test_search_comparison_endpoint(mock_get_default_model, mock_generate_embedding):
    # Setup mock embedding
    mock_generate_embedding.return_value = [0.1, 0.2, 0.3]

    # Setup mock reranker model
    mock_reranker = MagicMock()
    class MockContent:
        content = '[{"index": 0, "score": 0.95}]'
    mock_reranker.ainvoke = AsyncMock(return_value=MockContent())
    mock_get_default_model.return_value = mock_reranker

    response = client.post(
        "/api/search/compare",
        json={"query": "ICS firewall rules", "limit": 5}
    )
    assert response.status_code == 200
    data = response.json()
    assert "raw_latency_ms" in data
    assert "reranked_latency_ms" in data
    assert "raw_results" in data
    assert "reranked_results" in data
