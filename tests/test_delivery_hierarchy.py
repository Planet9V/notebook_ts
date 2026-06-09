"""
Unit and integration tests for the Project Delivery hierarchy,
document provenance registry, and ingestion pipeline.
"""
import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client."""
    from api.main import app
    return TestClient(app)


MOCK_PROVENANCE_RECORD = {
    "id": 42,
    "customer_id": "customer:cust1",
    "location_id": "location:loc1",
    "category": "diagrams",
    "file_name": "network_diagram.pdf",
    "file_hash": "mock_sha256_hash_value_network_diagram",
    "description": "Mocked network diagram",
    "apa_citation": "Acme. (2026). Network Diagram. TechPress.",
    "metadata": {
        "title": "Network Diagram",
        "author": "Acme",
        "publication_year": 2026,
        "diagrams_count": 1,
    },
    "created_at": MagicMock(isoformat=lambda: "2026-06-09T12:00:00Z"),
}


class TestDeliveryHierarchyValidation:
    """Test location & customer validation on notebooks and research items."""

    @patch("open_notebook.domain.base.repo_query", new_callable=AsyncMock)
    def test_validation_success_matching_customer(self, mock_repo_query, client):
        """validate_location_customer succeeds when location belongs to the customer."""
        from api.routers.notebooks import validate_location_customer

        # Mock Location.get check to return location with same customer ID
        mock_repo_query.return_value = [{"id": "location:loc1", "customer_id": "customer:cust1", "facility_name": "Test Facility"}]

        # This should execute without throwing an exception
        pytest.helpers = MagicMock()
        
        # Test direct execution
        import asyncio
        loop = asyncio.get_event_loop()
        loop.run_until_complete(validate_location_customer("location:loc1", "customer:cust1"))

    @patch("open_notebook.domain.base.repo_query", new_callable=AsyncMock)
    def test_validation_failure_mismatching_customer(self, mock_repo_query, client):
        """validate_location_customer raises 400 when location belongs to a different customer."""
        from api.routers.notebooks import validate_location_customer

        # Mock Location.get to return a different customer
        mock_repo_query.return_value = [{"id": "location:loc1", "customer_id": "customer:cust_other", "facility_name": "Test Facility"}]

        import asyncio
        loop = asyncio.get_event_loop()
        with pytest.raises(HTTPException) as exc_info:
            loop.run_until_complete(validate_location_customer("location:loc1", "customer:cust1"))
        
        assert exc_info.value.status_code == 400
        assert "does not belong to Customer" in exc_info.value.detail


class TestProvenanceIngestionRegistry:
    """Test POST, GET, and download routes for the provenance registry."""

    @patch("api.routers.notebooks.validate_location_customer", new_callable=AsyncMock)
    @patch("api.routers.research_memory.ResearchMemory.store_provenance_record", new_callable=AsyncMock)
    @patch("api.routers.research_memory.ResearchMemory.get_provenance_by_id", new_callable=AsyncMock)
    @patch("open_notebook.utils.embedding.generate_embedding", new_callable=AsyncMock)
    @patch("api.routers.research_memory.ResearchMemory.store_result", new_callable=AsyncMock)
    @patch("api.routers.research_memory.describe_diagram_via_vlm", new_callable=AsyncMock)
    @patch("docling.document_converter.DocumentConverter")
    def test_ingest_document_success(
        self,
        mock_converter_class,
        mock_vlm,
        mock_store_result,
        mock_embed,
        mock_get_prov,
        mock_store_prov,
        mock_validate,
        client,
    ):
        """POST /api/research-memory/provenance correctly processes files, VLM diagrams, and stores metadata."""
        # Setup mocks
        mock_validate.return_value = None
        mock_store_prov.return_value = 42
        mock_get_prov.return_value = MOCK_PROVENANCE_RECORD
        mock_embed.return_value = [0.1] * 1536
        mock_vlm.return_value = "Detailed flowchart description."

        # Mock Docling conversion output
        mock_converter = MagicMock()
        mock_converter_class.return_value = mock_converter
        
        mock_doc = MagicMock()
        mock_doc.export_to_markdown.return_value = "Here is an engineering layout. <!-- image -->"
        
        # Mock extracted diagram item
        from docling_core.types.doc import PictureItem
        mock_picture = MagicMock(spec=PictureItem)
        mock_picture.self_ref = "#/picture1"
        mock_picture.get_image.return_value = MagicMock() # Mock PIL Image
        
        # Iterate items yields (item, level)
        mock_doc.iterate_items.return_value = [(mock_picture, 0)]
        
        mock_conv_result = MagicMock()
        mock_conv_result.document = mock_doc
        mock_converter.convert.return_value = mock_conv_result

        # Call endpoint
        files = {"file": ("network_diagram.pdf", b"pdf_binary_content", "application/pdf")}
        data = {
            "customer_id": "customer:cust1",
            "location_id": "location:loc1",
            "category": "diagrams",
            "title": "Network Diagram",
            "author": "Acme",
            "publication_year": 2026,
            "publisher": "TechPress",
            "description": "Mocked network diagram",
        }

        response = client.post("/api/research-memory/provenance", files=files, data=data)

        # Assertions
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["id"] == 42
        assert response_data["customer_id"] == "customer:cust1"
        assert response_data["apa_citation"] == "Acme. (2026). Network Diagram. TechPress."
        
        # Verify VLM description replacement was triggered
        mock_vlm.assert_called_once()
        mock_store_result.assert_called_once()

    @patch("api.routers.research_memory.ResearchMemory.list_provenance", new_callable=AsyncMock)
    def test_list_provenance(self, mock_list_provenance, client):
        """GET /api/research-memory/provenance lists filtered ingested documents."""
        mock_list_provenance.return_value = [MOCK_PROVENANCE_RECORD]

        response = client.get("/api/research-memory/provenance?customer_id=customer:cust1&category=diagrams")

        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["file_name"] == "network_diagram.pdf"
        assert results[0]["id"] == 42

    @patch("api.routers.research_memory.ResearchMemory.get_provenance_by_id", new_callable=AsyncMock)
    @patch("api.routers.research_memory.ResearchMemory.get_provenance_data", new_callable=AsyncMock)
    def test_download_provenance_original(self, mock_get_data, mock_get_by_id, client):
        """GET /api/research-memory/provenance/{id}/original downloads the raw uploaded bytes."""
        mock_get_by_id.return_value = MOCK_PROVENANCE_RECORD
        mock_get_data.return_value = b"original_raw_bytes_stored"

        response = client.get("/api/research-memory/provenance/42/original")

        assert response.status_code == 200
        assert response.content == b"original_raw_bytes_stored"
        assert "attachment" in response.headers["content-disposition"]
        assert "network_diagram.pdf" in response.headers["content-disposition"]
        assert response.headers["content-type"] == "application/pdf"


class TestResearchItemsFilters:
    """Test location_id and category query filters in list_research_items."""

    @patch("api.routers.research_items.ResearchItem.get_by_location", new_callable=AsyncMock)
    def test_list_by_location(self, mock_get_by_location, client):
        """GET /api/research-items with location_id filters research items by location."""
        mock_ri = MagicMock()
        mock_ri.id = "research_item:ri1"
        mock_ri.name = "Houston Substation Audit"
        mock_ri.query = "Houston substation power audit"
        mock_ri.description = ""
        mock_ri.customer_id = "customer:cust1"
        mock_ri.project_id = None
        mock_ri.notebook_id = None
        mock_ri.transformation_id = None
        mock_ri.location_id = "location:loc1"
        mock_ri.category = "compliance"
        mock_ri.stage = "queued"
        mock_ri.status = "active"
        mock_ri.engine = "perplexity"
        mock_ri.engines = ["perplexity"]
        mock_ri.formatting_instructions = ""
        mock_ri.model_id = None
        mock_ri.interval = None
        mock_ri.is_recurring = False
        mock_ri.last_run = None
        mock_ri.next_run = None
        mock_ri.run_count = 0
        mock_ri.last_error = None
        mock_ri.results_summary = ""
        mock_ri.results_content = ""
        mock_ri.save_as_source = True
        mock_ri.tags = []
        mock_ri.created = "2026-06-09T00:00:00Z"
        mock_ri.updated = "2026-06-09T00:00:00Z"
        mock_ri.is_deep_research = False
        mock_ri.deep_research_state = ""
        mock_ri.deep_research_events = []

        mock_get_by_location.return_value = [mock_ri]

        response = client.get("/api/research-items?location_id=location:loc1&category=compliance")

        assert response.status_code == 200
        results = response.json()
        assert len(results) == 1
        assert results[0]["name"] == "Houston Substation Audit"
        assert results[0]["location_id"] == "location:loc1"
        assert results[0]["category"] == "compliance"
        mock_get_by_location.assert_called_once_with("location:loc1")
