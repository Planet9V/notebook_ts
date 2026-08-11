from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from open_notebook.database.repository import RecordID


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app
    return TestClient(app)


class TestSREFeatures:
    @patch("open_notebook.database.repository.repo_relate")
    @patch("open_notebook.database.repository.repo_query")
    def test_create_task_spec_link(self, mock_query, mock_relate, client):
        """Test task-to-spec link creation endpoint."""
        mock_relate.return_value = [
            {
                "id": RecordID("task_spec_link", "link1"),
                "in": RecordID("task", "task1"),
                "out": RecordID("note", "note1"),
                "created_at": "2026-06-17T15:46:00Z"
            }
        ]
        
        response = client.post(
            "/api/tasks/spec-links",
            json={"task_id": "task:task1", "spec_id": "note:note1"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "task_spec_link:link1" in data["id"]
        assert data["task_id"] == "task:task1"
        assert data["spec_id"] == "note:note1"

    @patch("open_notebook.database.repository.repo_delete")
    def test_delete_task_spec_link(self, mock_delete, client):
        """Test task-to-spec link deletion endpoint."""
        mock_delete.return_value = None
        
        response = client.delete("/api/tasks/spec-links/task_spec_link:link1")
        assert response.status_code == 200
        assert response.json() == {"message": "Link deleted", "id": "task_spec_link:link1"}

    @patch("open_notebook.database.repository.repo_query")
    def test_list_task_spec_links(self, mock_query, client):
        """Test listing compliance specifications linked to a task."""
        mock_query.return_value = [
            {
                "id": RecordID("task_spec_link", "link1"),
                "in": RecordID("task", "task1"),
                "out": RecordID("note", "note1"),
                "created_at": "2026-06-17T15:46:00Z"
            }
        ]
        
        response = client.get("/api/tasks/task:task1/spec-links")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "task_spec_link:link1" in data[0]["id"]
        assert data[0]["task_id"] == "task:task1"
        assert data[0]["spec_id"] == "note:note1"

    @patch("open_notebook.domain.task.Task.get")
    @patch("open_notebook.domain.task.Task.save")
    @patch("open_notebook.database.repository.repo_query")
    def test_task_status_transition_activity_logging(self, mock_query, mock_save, mock_get, client):
        """Test that changing a task status logs SRE transition to activity table."""
        from open_notebook.domain.task import Task
        mock_task = AsyncMock(spec=Task)
        mock_task.id = RecordID("task", "task1")
        mock_task.title = "Review Security Policy"
        mock_task.description = "Mock task description"
        mock_task.status = "todo"
        mock_task.priority = "medium"
        mock_task.due_date = "2026-06-30"
        mock_task.project_id = "project:proj1"
        mock_task.customer_id = "customer:acme"
        mock_task.notebook_id = "notebook:nb1"
        mock_task.assigned_to = "user:sre1"
        mock_task.created_by = "user:admin"
        mock_task.created = "2026-06-17T12:00:00Z"
        mock_task.updated = "2026-06-17T12:00:00Z"
        mock_task.tags = []
        
        # When update_task is called, get the task first
        mock_get.return_value = mock_task
        mock_save.return_value = None
        mock_query.return_value = []
        
        response = client.put(
            "/api/tasks/task:task1",
            json={"status": "in_progress"}
        )
        assert response.status_code == 200
        
        # Verify that activity write query was triggered because status changed from todo to in_progress
        # The first query or call to mock_query should be the activity insert
        assert mock_query.called
        args, kwargs = mock_query.call_args
        assert "CREATE activity SET" in args[0]
        assert "moved Task 'Review Security Policy' from todo to in_progress" in args[1]["desc"]
