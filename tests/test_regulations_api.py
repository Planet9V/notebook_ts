from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    """Create test client for regulations API."""
    from api.main import app
    return TestClient(app)

class TestRegulationsAPI:
    """Test suite for CSET Regulations and Questions API endpoints."""

    @patch("api.routers.regulations.repo_query")
    def test_get_regulations(self, mock_repo_query, client):
        """Test GET /api/regulations returns list of CSET regulations from SurrealDB."""
        mock_regulations = [
            {
                "id": "regulation:IEC_62443_3_3",
                "name": "IEC 62443-3-3",
                "fullName": "Industrial Communication Networks - System Security Requirements",
                "description": "Defines security capabilities for industrial automation and control systems (IACS).",
                "category": "Industrial Control Systems",
                "sector": "Cross-Sector",
                "questionCount": 10,
                "maturityLevels": ["SL-1", "SL-2", "SL-3", "SL-4"]
            },
            {
                "id": "regulation:NIST_800_82",
                "name": "NIST SP 800-82 r3",
                "fullName": "Guide to Industrial Control Systems (ICS) Security",
                "description": "Comprehensive guidance on securing SCADA, distributed control systems, and PLCs.",
                "category": "Industrial Control Systems",
                "sector": "Cross-Sector",
                "questionCount": 10,
                "maturityLevels": ["Low", "Moderate", "High"]
            }
        ]
        
        mock_repo_query.return_value = mock_regulations

        response = client.get("/api/regulations")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["id"] == "regulation:IEC_62443_3_3"
        assert data[0]["name"] == "IEC 62443-3-3"
        assert data[0]["fullName"] == "Industrial Communication Networks - System Security Requirements"
        assert data[0]["questionCount"] == 10
        assert data[0]["maturityLevels"] == ["SL-1", "SL-2", "SL-3", "SL-4"]
        
        assert data[1]["id"] == "regulation:NIST_800_82"
        assert data[1]["name"] == "NIST SP 800-82 r3"
        assert data[1]["fullName"] == "Guide to Industrial Control Systems (ICS) Security"
        assert data[1]["questionCount"] == 10
        assert data[1]["maturityLevels"] == ["Low", "Moderate", "High"]

    @patch("api.routers.regulations.repo_query")
    def test_get_regulation_questions(self, mock_repo_query, client):
        """Test GET /api/regulations/{id}/questions returns framework requirements/questions."""
        mock_questions = [
            {
                "id": "question:IEC_62443_3_3_Q1",
                "regulation_id": "regulation:IEC_62443_3_3",
                "standard_code": "SR 5.1",
                "question_text": "Are firewalls placed at all boundary crossing points?",
                "description": "Verify boundary firewall filtering rules.",
                "purdue_level": 4,
                "category": "Boundary Protection"
            },
            {
                "id": "question:IEC_62443_3_3_Q2",
                "regulation_id": "regulation:IEC_62443_3_3",
                "standard_code": "SR 5.2",
                "question_text": "Is direct zone bypass blocked?",
                "description": "Ensure no direct unmediated packet transitions.",
                "purdue_level": 3,
                "category": "Network Segmentation"
            }
        ]

        # First return for checking regulation existence, second for matching questions
        mock_repo_query.side_effect = [
            [{"id": "regulation:IEC_62443_3_3"}],  # existence check
            mock_questions  # query output
        ]

        response = client.get("/api/regulations/IEC_62443_3_3/questions")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["id"] == "question:IEC_62443_3_3_Q1"
        assert data[0]["standard_code"] == "SR 5.1"
        assert data[0]["question_text"] == "Are firewalls placed at all boundary crossing points?"
        assert data[0]["purdue_level"] == 4
        assert data[0]["category"] == "Boundary Protection"

    @patch("api.routers.regulations.repo_query")
    def test_get_regulation_questions_not_found(self, mock_repo_query, client):
        """Test GET /api/regulations/{id}/questions returns 404 for non-existent regulation ID."""
        # Setup empty regulations array indicating non-existence
        mock_repo_query.return_value = []

        response = client.get("/api/regulations/NON_EXISTENT_FW/questions")
        assert response.status_code == 404
        assert response.json()["detail"] == "Regulation not found"
