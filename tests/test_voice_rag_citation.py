import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.asyncio
@patch("open_notebook.ai.provision.provision_langchain_model", new_callable=AsyncMock)
async def test_voice_rag_dialogue_memory(mock_provision):
    # Set up mock langchain model
    mock_llm = AsyncMock()
    
    # We want to mock astream chunks
    async def mock_astream(*args, **kwargs):
        mock_chunk = MagicMock()
        mock_chunk.content = "My name is Assistant."
        yield mock_chunk
        
    mock_llm.astream = mock_astream
    
    # mock ainvoke for simple endpoint
    mock_response = MagicMock()
    mock_response.content = "Mock response content."
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)
    
    mock_provision.return_value = mock_llm

    # Send first message in a session
    payload = {
        "text": "Hello, my name is John.",
        "session_id": "session:test_voice_123",
        "use_rag": False
    }
    
    response = client.post("/api/voice/chat", json=payload)
    assert response.status_code == 200
    
    # Parse SSE stream to get the answer
    lines = response.text.split("\n")
    answer = ""
    for line in lines:
        if line.startswith("data: "):
            try:
                import json
                data = json.loads(line[6:])
                if data["type"] == "answer":
                    answer += data["content"]
            except Exception:
                pass
    
    assert "John" not in answer  # The response text should match mock output
    
    # Verify that the history gets stored
    # Now trigger second message and verify provision_langchain_model was called with history
    payload2 = {
        "text": "What is my name?",
        "session_id": "session:test_voice_123",
        "use_rag": False
    }
    
    client.post("/api/voice/chat", json=payload2)
    
    # Assert that the system prompt or history context was passed in to provision_langchain_model
    # The content passed to provision_langchain_model should include past dialogue
    assert mock_provision.call_count >= 2
    last_call_kwargs = mock_provision.call_args_list[-1][1]
    # Check that previous turns are indeed in the call context
    assert "John" in mock_provision.call_args_list[-1][1]["content"] or "John" in last_call_kwargs.get("content", "")
