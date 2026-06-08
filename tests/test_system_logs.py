from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app
from open_notebook.utils.logging import SurrealLogSink


@pytest.fixture
def client():
    """Create test client for system logs API."""
    return TestClient(app)


class TestSystemLogsAPI:
    """Test suite for System Logs API endpoints."""

    @patch("api.routers.system_logs.repo_query")
    def test_get_system_logs_success(self, mock_repo_query, client):
        """Test GET /api/system-logs successfully returns records and total count."""
        mock_repo_query.side_effect = [
            # First call: SELECT logs query
            [
                {
                    "id": "system_log:1",
                    "timestamp": "2026-06-08T07:18:25Z",
                    "level": "INFO",
                    "component": "api",
                    "message": "FastAPI started successfully",
                    "module": "api.main",
                    "function": "lifespan",
                    "line": 129,
                    "exception": None,
                    "extra": {},
                }
            ],
            # Second call: Count query
            [
                {
                    "count": 1,
                }
            ],
        ]

        response = client.get("/api/system-logs?component=api&level=INFO")
        assert response.status_code == 200
        data = response.json()
        
        assert "logs" in data
        assert "total" in data
        assert data["total"] == 1
        assert len(data["logs"]) == 1
        assert data["logs"][0]["id"] == "system_log:1"
        assert data["logs"][0]["level"] == "INFO"
        assert data["logs"][0]["message"] == "FastAPI started successfully"
        assert data["logs"][0]["component"] == "api"

    @patch("api.routers.system_logs.repo_query")
    def test_delete_system_logs_success(self, mock_repo_query, client):
        """Test DELETE /api/system-logs deletes records successfully."""
        mock_repo_query.return_value = [
            {"id": "system_log:1"},
            {"id": "system_log:2"},
        ]

        response = client.delete("/api/system-logs?component=worker")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["deleted_count"] == 2
        assert "deleted" in data["message"]


class TestSurrealLogSink:
    """Test suite for Loguru database sink and filtering logic."""

    @patch("open_notebook.utils.logging.threading.Thread")
    def test_sink_filtering_and_queueing(self, mock_thread):
        """Test that the sink correctly queues standard logs and filters recursive database logs."""
        # Creating SurrealLogSink without running background worker thread
        sink = SurrealLogSink("test-comp")

        class MockRecord:
            def __init__(self, name: str, message: str, level: str = "INFO"):
                class Level:
                    name = level
                self.record = {
                    "name": name,
                    "time": datetime.utcnow(),
                    "level": Level(),
                    "message": message,
                    "module": "test_module",
                    "function": "test_func",
                    "line": 10,
                    "exception": None,
                    "extra": {},
                }

        # 1. Test standard log record (should be queued)
        standard_msg = MockRecord("open_notebook.utils.text_utils", "Cleaned some text")
        sink.write(standard_msg)
        assert not sink.queue.empty()
        
        queued_payload = sink.queue.get()
        assert queued_payload["component"] == "test-comp"
        assert queued_payload["message"] == "Cleaned some text"
        assert queued_payload["module"] == "test_module"

        # 2. Test recursive driver logs (should be ignored)
        ignored_sources = [
            "surrealdb.client",
            "websockets.server",
            "asyncio",
            "httpcore.connection",
            "httpx",
            "open_notebook.database.repository",
        ]
        
        for source in ignored_sources:
            recursive_msg = MockRecord(source, "recursive communication trace")
            sink.write(recursive_msg)
            assert sink.queue.empty(), f"Source {source} was not ignored!"
