import pytest
import re
import json
from unittest.mock import patch, AsyncMock, MagicMock
from open_notebook.database.repository import RecordID


@pytest.fixture
def client():
    """Create test client after conftest setup."""
    from api.main import app
    from fastapi.testclient import TestClient
    return TestClient(app)


# Mock async generator for deep research stream
async def mock_stream_research_response(*args, **kwargs):
    yield "data: {\"type\": \"answer\", \"content\": \"Line 1 of research content.\\n\"}\n\n"
    yield "data: {\"type\": \"answer\", \"content\": \"Line 2 of research content.\\n\"}\n\n"
    yield "data: {\"type\": \"final_answer\", \"content\": \"Line 1 of research content.\\nLine 2 of research content.\"}\n\n"
    yield "data: {\"type\": \"complete\", \"final_answer\": \"Line 1 of research content.\\nLine 2 of research content.\"}\n\n"


# Mock save methods for domain models to assign IDs dynamically
async def mock_note_save(self):
    if not self.id:
        title_slug = self.title.split(".")[0] if self.title else "note1"
        self.id = RecordID("note", title_slug)


async def mock_task_save(self):
    if not self.id:
        self.id = RecordID("task", "task3")


class TestSlashCommands:
    @patch("open_notebook.commands.slash_commands.stream_research_response", side_effect=mock_stream_research_response)
    @patch("api.routers.chat.Notebook.get")
    @patch("open_notebook.commands.slash_commands.Source.save")
    @patch("open_notebook.commands.slash_commands.Source.add_to_notebook")
    @patch("open_notebook.commands.slash_commands.Source.vectorize")
    @patch("api.routers.chat.repo_query")
    @patch("api.routers.chat.chat_graph.aupdate_state")
    @patch("api.routers.chat.ChatSession.get")
    @patch("api.routers.chat.ChatSession.save")
    def test_execute_deep_research_slash_command(
        self,
        mock_session_save,
        mock_session_get,
        mock_aupdate,
        mock_query,
        mock_vectorize,
        mock_add_to_notebook,
        mock_save,
        mock_get_notebook,
        mock_stream,
        client
    ):
        """Test that typing /deep-research triggers deep research and returns the synthesized source link."""
        from open_notebook.domain.notebook import Notebook, ChatSession
        
        # Setup notebook mock
        mock_notebook = AsyncMock(spec=Notebook)
        mock_notebook.id = RecordID("notebook", "nb1")
        mock_notebook.name = "SRE Baseline Compliance"
        mock_get_notebook.return_value = mock_notebook
        
        # Setup session mocks
        mock_session = AsyncMock(spec=ChatSession)
        mock_session.id = RecordID("chat_session", "session1")
        mock_session.title = "SRE Chat"
        mock_session_get.return_value = mock_session
        
        # Mock refers_to relationship query to return the notebook ID
        mock_query.return_value = [{"out": RecordID("notebook", "nb1")}]
        
        # Execute chat POST endpoint with the slash command
        response = client.post(
            "/api/chat/execute",
            json={
                "session_id": "chat_session:session1",
                "message": "/deep-research Find standard baseline NERC CIP controls",
                "context": {"sources": {}, "notes": {}}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) >= 2
        
        # Check human message
        assert data["messages"][-2]["type"] == "human"
        assert "/deep-research" in data["messages"][-2]["content"]
        
        # Check AI message has deep research results
        ai_msg = data["messages"][-1]
        assert ai_msg["type"] == "ai"
        assert "Line 1 of research content." in ai_msg["content"]
        assert "Line 2 of research content." in ai_msg["content"]
        assert "<research_result" in ai_msg["content"]
        assert "Linked Source" in ai_msg["content"]

    @patch("api.routers.chat.Notebook.get")
    @patch("open_notebook.commands.slash_commands.Notebook.get")
    @patch("open_notebook.commands.slash_commands.Note.save", new=mock_note_save)
    @patch("open_notebook.commands.slash_commands.Note.add_to_notebook")
    @patch("open_notebook.commands.slash_commands.Task.get_all")
    @patch("api.routers.chat.repo_query")
    @patch("open_notebook.commands.slash_commands.repo_query")
    @patch("api.routers.chat.chat_graph.aupdate_state")
    @patch("api.routers.chat.ChatSession.get")
    @patch("api.routers.chat.ChatSession.save")
    def test_planning_init_slash_command(
        self,
        mock_session_save,
        mock_session_get,
        mock_aupdate,
        mock_commands_query,
        mock_chat_query,
        mock_tasks_get_all,
        mock_note_add,
        mock_commands_get_notebook,
        mock_chat_get_notebook,
        client
    ):
        """Test that /planning-with-files init initializes the plan and returns a visual dashboard."""
        from open_notebook.domain.notebook import Notebook, ChatSession, Note
        from open_notebook.domain.task import Task
        
        # Setup notebook mock
        mock_notebook = AsyncMock(spec=Notebook)
        mock_notebook.id = RecordID("notebook", "nb1")
        mock_notebook.name = "Facility Operations"
        mock_notebook.get_notes = AsyncMock(return_value=[])  # Empty initially
        mock_chat_get_notebook.return_value = mock_notebook
        mock_commands_get_notebook.return_value = mock_notebook
        
        # Setup session and database mocks
        mock_session = AsyncMock(spec=ChatSession)
        mock_session.id = RecordID("chat_session", "session1")
        mock_session.title = "SRE Chat"
        mock_session_get.return_value = mock_session
        
        # Mock queries
        mock_chat_query.return_value = [{"out": RecordID("notebook", "nb1")}]
        mock_commands_query.return_value = [{"out": RecordID("notebook", "nb1")}]
        
        # Mock database tasks: returns 2 tasks
        task1 = MagicMock(spec=Task)
        task1.id = RecordID("task", "task1")
        task1.notebook_id = RecordID("notebook", "nb1")
        task1.title = "Configure Backup Script"
        task1.status = "todo"
        
        task2 = MagicMock(spec=Task)
        task2.id = RecordID("task", "task2")
        task2.notebook_id = RecordID("notebook", "nb1")
        task2.title = "Run Firewall Audit"
        task2.status = "done"
        
        mock_tasks_get_all.return_value = [task1, task2]
        
        # Execute chat POST endpoint with the slash command
        response = client.post(
            "/api/chat/execute",
            json={
                "session_id": "chat_session:session1",
                "message": "/planning-with-files init",
                "context": {"sources": {}, "notes": {}}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        ai_msg = data["messages"][-1]
        
        # Verify the AI message content matches expected initialized template and stats
        assert ai_msg["type"] == "ai"
        assert "<planning_status" in ai_msg["content"]
        assert "50%" in ai_msg["content"]
        assert "1/2 tasks complete" in ai_msg["content"]
        assert "task_plan.md" in ai_msg["content"]

    @patch("api.routers.chat.Notebook.get")
    @patch("open_notebook.commands.slash_commands.Notebook.get")
    @patch("open_notebook.commands.slash_commands.Note.save", new=mock_note_save)
    @patch("open_notebook.commands.slash_commands.Task.get_all")
    @patch("open_notebook.commands.slash_commands.Task.save", new=mock_task_save)
    @patch("api.routers.chat.repo_query")
    @patch("open_notebook.commands.slash_commands.repo_query")
    @patch("open_notebook.commands.slash_commands.repo_relate")
    @patch("api.routers.chat.chat_graph.aupdate_state")
    @patch("api.routers.chat.ChatSession.get")
    @patch("api.routers.chat.ChatSession.save")
    def test_planning_sync_bidirectional(
        self,
        mock_session_save,
        mock_session_get,
        mock_aupdate,
        mock_relate,
        mock_commands_query,
        mock_chat_query,
        mock_tasks_get_all,
        mock_commands_get_notebook,
        mock_chat_get_notebook,
        client
    ):
        """Test that /planning-with-files sync bidirectionally updates database tasks and roadmap plan checkboxes."""
        from open_notebook.domain.notebook import Notebook, ChatSession, Note
        from open_notebook.domain.task import Task
        
        # Setup notebook mock with existing plan note
        mock_notebook = AsyncMock(spec=Notebook)
        mock_notebook.id = RecordID("notebook", "nb1")
        mock_notebook.name = "Sync Test Workspace"
        mock_chat_get_notebook.return_value = mock_notebook
        mock_commands_get_notebook.return_value = mock_notebook
        
        # Create a mock task_plan note content
        plan_content = (
            "# Roadmap Plan\n"
            "- [x] Configure Backup Script (ID: task:task1)\n"
            "- [ ] Run Firewall Audit (ID: task:task2)\n"
            "- [x] Create New SRE Compliance Log\n"
        )
        plan_note = Note(
            id="note:plan1",
            title="task_plan.md",
            content=plan_content,
            note_type="human"
        )
        findings_note = Note(id="note:find1", title="findings.md", content="# Findings", note_type="human")
        progress_note = Note(id="note:prog1", title="progress.md", content="# Progress", note_type="human")
        
        mock_notebook.get_notes = AsyncMock(return_value=[plan_note, findings_note, progress_note])
        
        # Setup session and database mocks
        mock_session = AsyncMock(spec=ChatSession)
        mock_session.id = RecordID("chat_session", "session1")
        mock_session.title = "SRE Chat"
        mock_session_get.return_value = mock_session
        
        # Mock queries
        mock_chat_query.return_value = [{"out": RecordID("notebook", "nb1")}]
        mock_commands_query.return_value = [{"out": RecordID("notebook", "nb1")}]
        
        # Mock database tasks: returns task1 (done) and task2 (done - status will change to todo during sync)
        task1 = MagicMock(spec=Task)
        task1.id = RecordID("task", "task1")
        task1.notebook_id = RecordID("notebook", "nb1")
        task1.title = "Configure Backup Script"
        task1.status = "done"
        
        task2 = MagicMock(spec=Task)
        task2.id = RecordID("task", "task2")
        task2.notebook_id = RecordID("notebook", "nb1")
        task2.title = "Run Firewall Audit"
        task2.status = "done"  # Done in DB, but checklist has [ ], so it will sync to status = "todo"
        
        mock_tasks_get_all.return_value = [task1, task2]
        
        # Execute chat POST endpoint with the slash command
        response = client.post(
            "/api/chat/execute",
            json={
                "session_id": "chat_session:session1",
                "message": "/planning-with-files sync",
                "context": {"sources": {}, "notes": {}}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        ai_msg = data["messages"][-1]
        
        # Verify sync outputs
        assert "🔄 Bidirectional Roadmap Sync Successful" in ai_msg["content"]
        assert "Created task 'Create New SRE Compliance Log'" in ai_msg["content"]
        assert "Set status to todo" in ai_msg["content"]
        assert "task_plan.md" in ai_msg["content"]
