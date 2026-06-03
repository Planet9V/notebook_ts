from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after conftest disables auth."""
    from api.main import app
    return TestClient(app)


class TestPipelineRulesApi:
    """Test suite for Pipeline Rule API endpoints."""

    @patch("api.routers.pipeline.PipelineRule")
    def test_get_pipeline_rules(self, mock_rule_cls, client):
        """Test getting all pipeline rules."""
        mock_rule = MagicMock()
        mock_rule.id = "pipeline_rule:rule123"
        mock_rule.stage = "research"
        mock_rule.action_type = "crawl"
        mock_rule.prompt = "Extract specs"
        mock_rule.query_template = ""
        mock_rule.model_override = None
        mock_rule.search_engine = "default"
        mock_rule.is_active = True
        mock_rule.created = "2026-01-01T00:00:00Z"
        mock_rule.updated = "2026-01-01T00:00:00Z"

        mock_rule_cls.get_all = AsyncMock(return_value=[mock_rule])

        response = client.get("/api/pipeline/rules")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "pipeline_rule:rule123"
        assert data[0]["stage"] == "research"
        assert data[0]["action_type"] == "crawl"

    @patch("api.routers.pipeline.PipelineRule")
    def test_create_pipeline_rule(self, mock_rule_cls, client):
        """Test creating a new pipeline rule."""
        mock_rule = MagicMock()
        mock_rule.id = "pipeline_rule:rule456"
        mock_rule.stage = "proposal"
        mock_rule.action_type = "search"
        mock_rule.prompt = "Find competitors"
        mock_rule.query_template = "Competitors of {client_name}"
        mock_rule.model_override = "gpt-4"
        mock_rule.search_engine = "default"
        mock_rule.is_active = True
        mock_rule.created = "2026-01-01T00:00:00Z"
        mock_rule.updated = "2026-01-01T00:00:00Z"
        mock_rule.save = AsyncMock()

        mock_rule_cls.return_value = mock_rule

        response = client.post(
            "/api/pipeline/rules",
            json={
                "stage": "proposal",
                "action_type": "search",
                "prompt": "Find competitors",
                "query_template": "Competitors of {client_name}",
                "model_override": "gpt-4",
                "is_active": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "pipeline_rule:rule456"
        assert data["stage"] == "proposal"
        assert data["action_type"] == "search"
        assert data["query_template"] == "Competitors of {client_name}"

    @patch("api.routers.pipeline.PipelineRule")
    def test_update_pipeline_rule(self, mock_rule_cls, client):
        """Test updating an existing pipeline rule."""
        mock_rule = MagicMock()
        mock_rule.id = "pipeline_rule:rule123"
        mock_rule.stage = "research"
        mock_rule.action_type = "crawl"
        mock_rule.prompt = "Old prompt"
        mock_rule.query_template = ""
        mock_rule.model_override = None
        mock_rule.search_engine = "default"
        mock_rule.is_active = True
        mock_rule.created = "2026-01-01T00:00:00Z"
        mock_rule.updated = "2026-01-01T00:00:00Z"
        mock_rule.save = AsyncMock()

        mock_rule_cls.get = AsyncMock(return_value=mock_rule)

        response = client.put(
            "/api/pipeline/rules/pipeline_rule:rule123",
            json={
                "stage": "research",
                "action_type": "crawl",
                "prompt": "Updated prompt",
                "query_template": "",
                "model_override": None,
                "is_active": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["prompt"] == "Updated prompt"

    @patch("api.routers.pipeline.PipelineRule")
    def test_delete_pipeline_rule(self, mock_rule_cls, client):
        """Test deleting a pipeline rule."""
        mock_rule = MagicMock()
        mock_rule.id = "pipeline_rule:rule123"
        mock_rule.delete = AsyncMock()

        mock_rule_cls.get = AsyncMock(return_value=mock_rule)

        response = client.delete("/api/pipeline/rules/pipeline_rule:rule123")
        assert response.status_code == 200
        assert response.json()["message"] == "Pipeline rule deleted successfully"


class TestPipelineWorker:
    """Test suite for the Pipeline Worker background execution."""

    @pytest.mark.anyio
    @patch("open_notebook.domain.pipeline_worker.Notebook")
    @patch("open_notebook.domain.pipeline_worker.PipelineRule")
    @patch("open_notebook.domain.pipeline_worker.crawl_prospect_website")
    @patch("open_notebook.domain.pipeline_worker.provision_langchain_model")
    @patch("open_notebook.domain.pipeline_worker.Note")
    @patch("open_notebook.domain.pipeline_worker.Source")
    @patch("open_notebook.domain.pipeline_worker.Asset")
    async def test_run_pipeline_automation_crawl(
        self,
        mock_asset_cls,
        mock_source_cls,
        mock_note_cls,
        mock_provision_model,
        mock_crawl,
        mock_rule_cls,
        mock_notebook_cls,
    ):
        """Test that run_pipeline_automation executes crawl rule, invokes LLM, and creates source & note."""
        from open_notebook.domain.pipeline_worker import run_pipeline_automation

        # Mock Notebook
        mock_notebook = MagicMock()
        mock_notebook.id = "notebook:nb123"
        mock_notebook.name = "Test Client"
        mock_notebook.prospect_website = "https://example.com"
        mock_notebook.save = AsyncMock()
        mock_notebook_cls.get = AsyncMock(return_value=mock_notebook)

        # Mock Rule
        mock_rule = MagicMock()
        mock_rule.id = "pipeline_rule:rule123"
        mock_rule.stage = "research"
        mock_rule.action_type = "crawl"
        mock_rule.prompt = "Extract tech stack specs"
        mock_rule.is_active = True
        mock_rule.model_override = "gpt-4"
        mock_rule_cls.get_all = AsyncMock(return_value=[mock_rule])

        # Mock Crawl & LLM
        mock_crawl.return_value = "<html>Some scraped text</html>"
        mock_model = AsyncMock()
        mock_response = MagicMock()
        mock_response.content = "Extracted specifications: React, FastAPI"
        mock_model.ainvoke = AsyncMock(return_value=mock_response)
        mock_provision_model.return_value = mock_model

        # Mock Source & Asset creation
        mock_source = AsyncMock()
        mock_source_cls.return_value = mock_source
        mock_asset = MagicMock()
        mock_asset_cls.return_value = mock_asset

        # Mock Note creation
        mock_note = AsyncMock()
        mock_note_cls.return_value = mock_note

        # Run background worker
        await run_pipeline_automation("notebook:nb123", "research")

        # Verify crawl calls
        mock_crawl.assert_called_once_with("https://example.com")
        
        # Verify Asset & Source calls
        mock_asset_cls.assert_called_once_with(url="https://example.com")
        mock_source_cls.assert_called_once_with(
            title="Scraped Webpage: https://example.com",
            full_text="<html>Some scraped text</html>",
            asset=mock_asset,
        )
        mock_source.save.assert_called_once()
        mock_source.add_to_notebook.assert_called_once_with("notebook:nb123")
        mock_source.vectorize.assert_called_once()

        # Verify Note calls
        assert mock_provision_model.call_count == 2
        mock_note_cls.assert_called_once_with(
            title="Crawl Intelligence: research",
            content="Extracted specifications: React, FastAPI",
            note_type="ai",
        )
        mock_note.save.assert_called_once()
        mock_note.add_to_notebook.assert_called_once_with("notebook:nb123")

    @pytest.mark.anyio
    @patch("open_notebook.domain.pipeline_worker.Notebook")
    @patch("open_notebook.domain.pipeline_worker.PipelineRule")
    @patch("open_notebook.domain.pipeline_worker.execute_web_search")
    @patch("open_notebook.domain.pipeline_worker.provision_langchain_model")
    @patch("open_notebook.domain.pipeline_worker.Note")
    @patch("open_notebook.domain.pipeline_worker.Source")
    async def test_run_pipeline_automation_search(
        self,
        mock_source_cls,
        mock_note_cls,
        mock_provision_model,
        mock_search,
        mock_rule_cls,
        mock_notebook_cls,
    ):
        """Test that run_pipeline_automation executes search rule, invokes LLM, and creates source & note."""
        from open_notebook.domain.pipeline_worker import run_pipeline_automation

        # Mock Notebook
        mock_notebook = MagicMock()
        mock_notebook.id = "notebook:nb123"
        mock_notebook.name = "Test Client"
        mock_notebook.client_name = "Test Client Corp"
        mock_notebook.prospect_website = "https://example.com"
        mock_notebook.save = AsyncMock()
        mock_notebook_cls.get = AsyncMock(return_value=mock_notebook)

        # Mock Rule
        mock_rule = MagicMock()
        mock_rule.id = "pipeline_rule:rule456"
        mock_rule.stage = "research"
        mock_rule.action_type = "search"
        mock_rule.prompt = "Summarize competitors"
        mock_rule.query_template = "Competitors of {client_name}"
        mock_rule.is_active = True
        mock_rule.model_override = "gpt-4"
        mock_rule.search_engine = "default"
        mock_rule_cls.get_all = AsyncMock(return_value=[mock_rule])

        # Mock Web Search
        mock_search.return_value = [
            {"title": "Competitor A", "url": "https://comp-a.com", "content": "Comp A description"},
            {"title": "Competitor B", "url": "https://comp-b.com", "content": "Comp B description"},
        ]

        # Mock LLM
        mock_model = AsyncMock()
        mock_response = MagicMock()
        mock_response.content = "Competitors summarized: Comp A, Comp B"
        mock_model.ainvoke = AsyncMock(return_value=mock_response)
        mock_provision_model.return_value = mock_model

        # Mock Source & Note creation
        mock_source = AsyncMock()
        mock_source_cls.return_value = mock_source
        mock_note = AsyncMock()
        mock_note_cls.return_value = mock_note

        # Run background worker
        await run_pipeline_automation("notebook:nb123", "research")

        # Verify search execution
        mock_search.assert_called_once_with("Competitors of Test Client Corp", search_engine="default")

        # Verify source creation (compiled snippets)
        expected_context = (
            "[1] Competitor A\nURL: https://comp-a.com\nSnippet: Comp A description\n\n"
            "[2] Competitor B\nURL: https://comp-b.com\nSnippet: Comp B description"
        )
        mock_source_cls.assert_called_once_with(
            title="Web Search: Competitors of Test Client Corp",
            full_text=expected_context,
        )
        mock_source.save.assert_called_once()
        mock_source.add_to_notebook.assert_called_once_with("notebook:nb123")
        mock_source.vectorize.assert_called_once()

        # Verify note creation
        mock_note_cls.assert_called_once_with(
            title="Search Intelligence: research",
            content="Competitors summarized: Comp A, Comp B",
            note_type="ai",
        )
        mock_note.save.assert_called_once()
        mock_note.add_to_notebook.assert_called_once_with("notebook:nb123")


class TestNotebookContactsDossier:
    """Test suite for B2B CRM Contacts Dossier operations."""

    @patch("api.routers.notebooks.Notebook")
    @patch("api.routers.notebooks.repo_query")
    def test_get_notebook_with_contacts(self, mock_repo_query, mock_notebook_cls, client):
        """Test fetching a notebook containing contact dossier stakeholders."""
        notebook_id = "notebook:nb123"
        mock_notebook_data = {
            "id": notebook_id,
            "name": "Acme Corp Notebook",
            "description": "Enterprise security alignment",
            "archived": False,
            "created": "2026-01-01T00:00:00Z",
            "updated": "2026-01-01T00:00:00Z",
            "stage": "research",
            "client_name": "Acme Corp",
            "estimated_value": 150000.0,
            "prospect_website": "https://acme.com",
            "source_count": 2,
            "note_count": 1,
            "contacts": [
                {"name": "Jane Doe", "role": "Lead Architect", "email": "jane@acme.com"}
            ]
        }
        mock_repo_query.return_value = [mock_notebook_data]

        response = client.get(f"/api/notebooks/{notebook_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == notebook_id
        assert len(data["contacts"]) == 1
        assert data["contacts"][0]["name"] == "Jane Doe"
        assert data["contacts"][0]["role"] == "Lead Architect"
        assert data["contacts"][0]["email"] == "jane@acme.com"

    @patch("api.routers.notebooks.Notebook")
    @patch("api.routers.notebooks.repo_query")
    def test_update_notebook_contacts(self, mock_repo_query, mock_notebook_cls, client):
        """Test updating contact dossier stakeholders on a notebook."""
        notebook_id = "notebook:nb123"
        mock_notebook = MagicMock()
        mock_notebook.id = notebook_id
        mock_notebook.name = "Acme Corp Notebook"
        mock_notebook.description = "Enterprise security alignment"
        mock_notebook.archived = False
        mock_notebook.stage = "research"
        mock_notebook.client_name = "Acme Corp"
        mock_notebook.estimated_value = 150000.0
        mock_notebook.prospect_website = "https://acme.com"
        mock_notebook.contacts = []
        mock_notebook.save = AsyncMock()

        mock_notebook_cls.get = AsyncMock(return_value=mock_notebook)

        mock_updated_data = {
            "id": notebook_id,
            "name": "Acme Corp Notebook",
            "description": "Enterprise security alignment",
            "archived": False,
            "created": "2026-01-01T00:00:00Z",
            "updated": "2026-01-01T00:00:00Z",
            "stage": "research",
            "client_name": "Acme Corp",
            "estimated_value": 150000.0,
            "prospect_website": "https://acme.com",
            "source_count": 2,
            "note_count": 1,
            "contacts": [
                {"name": "John Smith", "role": "VP Security", "email": "john@acme.com"}
            ]
        }
        mock_repo_query.return_value = [mock_updated_data]

        response = client.put(
            f"/api/notebooks/{notebook_id}",
            json={
                "contacts": [
                    {"name": "John Smith", "role": "VP Security", "email": "john@acme.com"}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["contacts"]) == 1
        assert data["contacts"][0]["name"] == "John Smith"
        assert mock_notebook.contacts == [{"name": "John Smith", "role": "VP Security", "email": "john@acme.com"}]
        mock_notebook.save.assert_called_once()


class TestNotebookCustomerIntegration:
    """Test suite for Notebook-Customer relationship integration."""

    @patch("api.routers.notebooks.Notebook")
    @patch("api.routers.notebooks.repo_query")
    def test_get_notebooks_with_customer_id(self, mock_repo_query, mock_notebook_cls, client):
        """Test fetching list of notebooks returns customer_id field."""
        mock_notebooks_data = [
            {
                "id": "notebook:nb123",
                "name": "Acme Corp Notebook",
                "stage": "research",
                "customer_id": "customer:123",
            }
        ]
        mock_repo_query.return_value = mock_notebooks_data

        response = client.get("/api/notebooks")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "notebook:nb123"
        assert data[0]["customer_id"] == "customer:123"

    @patch("api.routers.notebooks.Notebook")
    def test_create_notebook_with_customer_id(self, mock_notebook_cls, client):
        """Test creating a new notebook with customer_id."""
        mock_notebook = MagicMock()
        mock_notebook.id = "notebook:nb123"
        mock_notebook.name = "Acme Corp Notebook"
        mock_notebook.description = ""
        mock_notebook.stage = "lead"
        mock_notebook.client_name = ""
        mock_notebook.estimated_value = 0.0
        mock_notebook.prospect_website = ""
        mock_notebook.contacts = []
        mock_notebook.crawl_failed = False
        mock_notebook.suggested_contacts = []
        mock_notebook.customer_id = "customer:123"
        mock_notebook.created = "2026-01-01T00:00:00Z"
        mock_notebook.updated = "2026-01-01T00:00:00Z"
        mock_notebook.save = AsyncMock()

        mock_notebook_cls.return_value = mock_notebook

        response = client.post(
            "/api/notebooks",
            json={
                "name": "Acme Corp Notebook",
                "stage": "lead",
                "customer_id": "customer:123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "notebook:nb123"
        assert data["customer_id"] == "customer:123"

    @patch("api.routers.notebooks.Notebook")
    @patch("api.routers.notebooks.repo_query")
    def test_get_notebook_with_customer_id(self, mock_repo_query, mock_notebook_cls, client):
        """Test fetching a single notebook returns customer_id."""
        notebook_id = "notebook:nb123"
        mock_notebook_data = {
            "id": notebook_id,
            "name": "Acme Corp Notebook",
            "stage": "research",
            "customer_id": "customer:123"
        }
        mock_repo_query.return_value = [mock_notebook_data]

        response = client.get(f"/api/notebooks/{notebook_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == notebook_id
        assert data["customer_id"] == "customer:123"

    @patch("api.routers.notebooks.Notebook")
    @patch("api.routers.notebooks.repo_query")
    def test_update_notebook_customer_id(self, mock_repo_query, mock_notebook_cls, client):
        """Test updating a notebook's customer_id."""
        notebook_id = "notebook:nb123"
        mock_notebook = MagicMock()
        mock_notebook.id = notebook_id
        mock_notebook.name = "Acme Corp Notebook"
        mock_notebook.stage = "research"
        mock_notebook.customer_id = "customer:123"
        mock_notebook.save = AsyncMock()

        mock_notebook_cls.get = AsyncMock(return_value=mock_notebook)

        mock_updated_data = {
            "id": notebook_id,
            "name": "Acme Corp Notebook",
            "stage": "research",
            "customer_id": "customer:456"
        }
        mock_repo_query.return_value = [mock_updated_data]

        response = client.put(
            f"/api/notebooks/{notebook_id}",
            json={
                "customer_id": "customer:456"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["customer_id"] == "customer:456"
        assert mock_notebook.customer_id == "customer:456"
        mock_notebook.save.assert_called_once()

