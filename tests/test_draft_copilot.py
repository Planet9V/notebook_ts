from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.asyncio
@patch("open_notebook.ai.models.model_manager.get_default_model", new_callable=AsyncMock)
async def test_draft_copilot_endpoint(mock_get_default_model):
    # Mock default chat model invocation
    mock_model = MagicMock()
    
    # Mock return value of chat model
    class MockMessage:
        content = "Expanded suggestion for B2B contract milestones."
    
    mock_model.ainvoke = AsyncMock(return_value=MockMessage())
    mock_get_default_model.return_value = mock_model

    res = client.post(
        "/api/agents/draft/copilot",
        json={
            "text": "Initial draft SOW sentence.",
            "action": "expand"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "suggestion" in data
    assert data["suggestion"] == "Expanded suggestion for B2B contract milestones."
