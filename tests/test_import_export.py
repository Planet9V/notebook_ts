"""Test suite for Import / Export API endpoints.

Covers:
- CSV and XLSX preview parsing
- Auto-mapping (header alias detection)
- Import execution: creation, duplicate skip/update/create, contact linking
- File size validation (10 MB limit)
- Edge cases: empty files, missing name, malformed data
- Customer and contact export endpoints
"""

import io
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for import/export API."""
    from api.main import app

    return TestClient(app)


def _make_csv(rows: list[list[str]]) -> bytes:
    """Build a CSV byte payload from a list of rows."""
    buf = io.StringIO()
    import csv

    writer = csv.writer(buf)
    for row in rows:
        writer.writerow(row)
    return buf.getvalue().encode("utf-8")


# ──────────────────────────────────────────────────────────────────────────────
# Preview Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestImportPreview:
    """Tests for POST /api/customers/import/preview."""

    def test_preview_csv_basic(self, client):
        """Preview should parse a CSV and return headers, row count, and sample rows."""
        csv_data = _make_csv([
            ["Company Name", "Website", "Industry"],
            ["Acme Corp", "acme.com", "Energy"],
            ["Beta Inc", "beta.com", "Water"],
            ["Gamma LLC", "gamma.com", "Chemical"],
        ])

        response = client.post(
            "/api/customers/import/preview",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["file_name"] == "test.csv"
        assert data["total_rows"] == 3
        assert data["columns"] == ["Company Name", "Website", "Industry"]
        assert len(data["sample_rows"]) == 3

    def test_preview_auto_mapping(self, client):
        """Preview should auto-map known aliases to target fields."""
        csv_data = _make_csv([
            ["Company Name", "Website", "Email", "Phone Number"],
            ["Acme Corp", "acme.com", "info@acme.com", "555-1234"],
        ])

        response = client.post(
            "/api/customers/import/preview",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )

        assert response.status_code == 200
        data = response.json()
        mapping = data["suggested_mapping"]
        assert mapping.get("Company Name") == "name"
        assert mapping.get("Website") == "website"
        assert mapping.get("Email") == "email"

    def test_preview_returns_available_fields(self, client):
        """Preview should list available target fields for customers and contacts."""
        csv_data = _make_csv([
            ["Name"],
            ["Test Corp"],
        ])

        response = client.post(
            "/api/customers/import/preview",
            files={"file": ("test.csv", csv_data, "text/csv")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "name" in data["available_customer_fields"]
        assert "website" in data["available_customer_fields"]
        assert len(data["available_contact_fields"]) > 0

    def test_preview_empty_file(self, client):
        """Preview should reject a file with no headers."""
        csv_data = b""

        response = client.post(
            "/api/customers/import/preview",
            files={"file": ("empty.csv", csv_data, "text/csv")},
        )

        assert response.status_code == 400

    def test_preview_file_too_large(self, client):
        """Preview should reject files over 10 MB."""
        # 10 MB + 1 byte
        large_data = b"x" * (10 * 1024 * 1024 + 1)

        response = client.post(
            "/api/customers/import/preview",
            files={"file": ("big.csv", large_data, "text/csv")},
        )

        assert response.status_code == 413
        assert "10MB" in response.json()["detail"]


# ──────────────────────────────────────────────────────────────────────────────
# Import Execution Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestImportExecute:
    """Tests for POST /api/customers/import."""

    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_creates_customers(self, mock_repo_query, mock_repo_create, client):
        """Import should create customer records for each valid row."""
        # No existing customers for dedup
        mock_repo_query.return_value = []
        mock_repo_create.return_value = [{"id": "customer:new1", "name": "Acme Corp"}]

        csv_data = _make_csv([
            ["Company Name", "Website"],
            ["Acme Corp", "acme.com"],
            ["Beta Inc", "beta.com"],
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {
                "Company Name": "name",
                "Website": "website",
            },
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "create",
            },
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_rows"] == 2
        assert data["customers_created"] == 2
        assert data["customers_updated"] == 0
        assert data["customers_skipped"] == 0
        assert len(data["errors"]) == 0
        assert "batch_id" in data

    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_missing_name_creates_error(self, mock_repo_query, mock_repo_create, client):
        """Import should report an error for rows without a customer name."""
        mock_repo_query.return_value = []

        csv_data = _make_csv([
            ["Company Name", "Website"],
            ["", "no-name.com"],  # Missing name
            ["Valid Corp", "valid.com"],
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {
                "Company Name": "name",
                "Website": "website",
            },
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "create",
            },
        }

        mock_repo_create.return_value = [{"id": "customer:new1", "name": "Valid Corp"}]

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["customers_created"] == 1
        assert len(data["errors"]) == 1
        assert data["errors"][0]["field"] == "name"
        assert "Missing" in data["errors"][0]["error"]

    @patch("api.routers.import_export.repo_update")
    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_duplicate_skip(self, mock_repo_query, mock_repo_create, mock_repo_update, client):
        """Import should skip duplicates when duplicate_strategy is 'skip'."""
        # Existing customers for dedup lookup
        mock_repo_query.return_value = [
            {"id": "customer:existing1", "name": "Acme Corp", "website": "acme.com"}
        ]

        csv_data = _make_csv([
            ["Company Name", "Website"],
            ["Acme Corp", "acme-new.com"],  # Duplicate name
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {"Company Name": "name", "Website": "website"},
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "skip",
            },
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["customers_skipped"] == 1
        assert data["customers_created"] == 0
        mock_repo_create.assert_not_called()

    @patch("api.routers.import_export.repo_update")
    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_duplicate_update(self, mock_repo_query, mock_repo_create, mock_repo_update, client):
        """Import should update duplicates when duplicate_strategy is 'update'."""
        mock_repo_query.return_value = [
            {"id": "customer:existing1", "name": "Acme Corp", "website": "old.com"}
        ]
        mock_repo_update.return_value = [
            {"id": "customer:existing1", "name": "Acme Corp", "website": "new.com"}
        ]

        csv_data = _make_csv([
            ["Company Name", "Website"],
            ["Acme Corp", "new.com"],
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {"Company Name": "name", "Website": "website"},
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "update",
            },
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["customers_updated"] == 1
        assert data["customers_created"] == 0

    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_with_contact_fields(self, mock_repo_query, mock_repo_create, client):
        """Import should create contacts when contact columns are mapped."""
        mock_repo_query.return_value = []
        mock_repo_create.side_effect = [
            [{"id": "customer:new1", "name": "Acme Corp"}],  # Customer
            [{"id": "contact:new1", "first_name": "John"}],   # Contact
        ]

        csv_data = _make_csv([
            ["Company Name", "Contact Name", "Contact Email"],
            ["Acme Corp", "John Doe", "john@acme.com"],
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {
                "Company Name": "name",
                "Contact Name": "contact_name",
                "Contact Email": "contact_email",
            },
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "create",
            },
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["customers_created"] == 1
        assert data["contacts_created"] == 1

    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_applies_default_options(self, mock_repo_query, mock_repo_create, client):
        """Import should apply default type, tier, and tags from options."""
        mock_repo_query.return_value = []

        created_data = {}

        async def capture_create(table, data):
            nonlocal created_data
            created_data = data.copy()
            return [{"id": "customer:new1", "name": data.get("name"), **data}]

        mock_repo_create.side_effect = capture_create

        csv_data = _make_csv([
            ["Company Name"],
            ["Defaults Corp"],
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {"Company Name": "name"},
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "create",
                "default_customer_type": "client",
                "default_tier": "enterprise",
                "tags": ["imported", "batch1"],
            },
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        # Verify defaults were applied via create call
        assert mock_repo_create.call_count >= 1
        call_args = mock_repo_create.call_args_list[0]
        call_data = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("data", {})
        assert call_data.get("customer_type") == "client"
        assert call_data.get("tier") == "enterprise"

    def test_import_invalid_config_json(self, client):
        """Import should reject malformed import_config JSON."""
        csv_data = _make_csv([
            ["Company Name"],
            ["Test Corp"],
        ])

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": "not valid json"},
        )

        assert response.status_code == 422

    def test_import_file_too_large(self, client):
        """Import should reject files over 10 MB."""
        large_data = b"Name\n" + b"x" * (10 * 1024 * 1024 + 1)

        config = {
            "file_name": "big.csv",
            "column_mapping": {"Name": "name"},
            "options": {},
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("big.csv", large_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        # May be 400 or 413 depending on parse order
        assert response.status_code in (400, 413)

    @patch("api.routers.import_export.repo_create")
    @patch("api.routers.import_export.repo_query")
    def test_import_coerces_numeric_fields(self, mock_repo_query, mock_repo_create, client):
        """Import should coerce annual_revenue and employee_count to numbers."""
        mock_repo_query.return_value = []
        mock_repo_create.return_value = [{"id": "customer:new1", "name": "Numeric Corp"}]

        csv_data = _make_csv([
            ["Company Name", "Annual Revenue", "Employee Count"],
            ["Numeric Corp", "$1,500,000", "2,500"],
        ])

        config = {
            "file_name": "test.csv",
            "column_mapping": {
                "Company Name": "name",
                "Annual Revenue": "annual_revenue",
                "Employee Count": "employee_count",
            },
            "options": {
                "create_notebooks": False,
                "duplicate_strategy": "create",
            },
        }

        response = client.post(
            "/api/customers/import",
            files={"file": ("test.csv", csv_data, "text/csv")},
            data={"import_config": json.dumps(config)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["customers_created"] == 1
        # Verify the create call got coerced numbers
        call_data = mock_repo_create.call_args_list[0][0][1]
        assert call_data["annual_revenue"] == 1500000.0
        assert call_data["employee_count"] == 2500


# ──────────────────────────────────────────────────────────────────────────────
# Export Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestExportCustomers:
    """Tests for GET /api/customers/export."""

    @patch("api.routers.import_export.repo_query")
    def test_export_csv_basic(self, mock_repo_query, client):
        """Customer export should return a downloadable CSV."""
        mock_repo_query.return_value = [
            {
                "id": "customer:1",
                "name": "Acme Corp",
                "website": "acme.com",
                "industry": "Energy",
                "tags": ["enterprise", "priority"],
                "created": "2026-01-01T00:00:00Z",
                "updated": "2026-01-01T00:00:00Z",
            },
        ]

        response = client.get("/api/customers/export?format=csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment" in response.headers.get("content-disposition", "")

        # Parse CSV content
        content = response.text
        lines = content.strip().split("\n")
        assert len(lines) >= 2  # header + 1 data row
        assert "Acme Corp" in lines[1]

    @patch("api.routers.import_export.repo_query")
    def test_export_csv_with_contacts(self, mock_repo_query, client):
        """Customer export with include_contacts should add contact columns."""
        mock_repo_query.side_effect = [
            # Customers query
            [{"id": "customer:1", "name": "Acme Corp", "tags": []}],
            # Contacts query
            [
                {
                    "id": "contact:1",
                    "customer_id": "customer:1",
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@acme.com",
                    "phone": "555-1234",
                    "title": "CTO",
                }
            ],
        ]

        response = client.get("/api/customers/export?format=csv&include_contacts=true")
        assert response.status_code == 200
        content = response.text
        assert "contact_name" in content
        assert "John Doe" in content

    @patch("api.routers.import_export.repo_query")
    def test_export_empty_dataset(self, mock_repo_query, client):
        """Export should succeed with empty dataset (header only CSV)."""
        mock_repo_query.return_value = []

        response = client.get("/api/customers/export?format=csv")
        assert response.status_code == 200
        content = response.text
        lines = content.strip().split("\n")
        assert len(lines) == 1  # header only


class TestExportContacts:
    """Tests for GET /api/contacts/export."""

    @patch("api.routers.import_export.repo_query")
    def test_export_contacts_csv(self, mock_repo_query, client):
        """Contact export should return downloadable CSV with all contact fields."""
        mock_repo_query.return_value = [
            {
                "id": "contact:1",
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane@acme.com",
                "phone": "555-9876",
                "mobile": "555-0000",
                "title": "VP Engineering",
                "department": "Engineering",
                "seniority": "VP",
                "customer_id": "customer:1",
                "status": "active",
                "tags": ["tech", "decision-maker"],
                "source": "manual",
                "created": "2026-01-01T00:00:00Z",
                "updated": "2026-01-01T00:00:00Z",
            }
        ]

        response = client.get("/api/contacts/export?format=csv")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

        content = response.text
        assert "Jane" in content
        assert "Smith" in content
        # Tags should be semicolon-joined
        assert "tech; decision-maker" in content


# ──────────────────────────────────────────────────────────────────────────────
# Internal Helper Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestParserHelpers:
    """Tests for internal CSV/XLSX parsing helpers."""

    def test_parse_csv_with_bom(self):
        """CSV parser should handle UTF-8 BOM prefix."""
        from api.routers.import_export import _parse_csv

        bom_csv = b"\xef\xbb\xbfName,Website\nAcme,acme.com"
        headers, rows = _parse_csv(bom_csv)
        assert headers == ["Name", "Website"]
        assert len(rows) == 1
        assert rows[0] == ["Acme", "acme.com"]

    def test_parse_csv_empty(self):
        """CSV parser should return empty lists for empty input."""
        from api.routers.import_export import _parse_csv

        headers, rows = _parse_csv(b"")
        assert headers == []
        assert rows == []

    def test_auto_map_columns_known_aliases(self):
        """Auto-mapping should recognize common column name aliases."""
        from api.routers.import_export import _auto_map_columns

        result = _auto_map_columns(["Company Name", "Website", "Phone Number", "Contact Email"])
        assert result["Company Name"] == "name"
        assert result["Website"] == "website"
        assert result["Phone Number"] == "phone"
        assert result["Contact Email"] == "contact_email"

    def test_auto_map_columns_unknown_headers(self):
        """Auto-mapping should skip unrecognized column names."""
        from api.routers.import_export import _auto_map_columns

        result = _auto_map_columns(["Custom Field XYZ", "Random Data"])
        assert len(result) == 0
