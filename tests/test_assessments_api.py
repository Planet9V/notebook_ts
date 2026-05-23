from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    """Create test client for assessments API."""
    from api.main import app
    return TestClient(app)

class TestAssessmentsAPI:
    """Test suite for CSET-style Compliance Assessments and Auditing Sessions API endpoints."""

    @patch("api.routers.assessments.repo_query")
    @patch("api.routers.assessments.repo_create")
    def test_create_assessment(self, mock_repo_create, mock_repo_query, client):
        """Test POST /api/assessments links a customer and compliance framework."""
        # 1. Mock checks (customer exists, regulation exists, no existing link)
        mock_repo_query.side_effect = [
            [{"id": "customer:cust_acme"}],  # customer check
            [{"id": "regulation:IEC_62443_3_3"}],  # regulation check
            []  # no existing link
        ]
        
        # 2. Mock create output
        mock_repo_create.return_value = {
            "id": "assessment:assess_123",
            "customer_id": "customer:cust_acme",
            "framework_id": "regulation:IEC_62443_3_3",
            "created_at": "2026-05-23T22:47:00Z"
        }

        response = client.post("/api/assessments", json={
            "customer_id": "cust_acme",
            "framework_id": "IEC_62443_3_3"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "assessment:assess_123"
        assert data["customer_id"] == "customer:cust_acme"
        assert data["framework_id"] == "regulation:IEC_62443_3_3"

    @patch("api.routers.assessments.repo_query")
    def test_get_assessments(self, mock_repo_query, client):
        """Test GET /api/assessments lists customer frameworks."""
        mock_repo_query.return_value = [
            {
                "id": "assessment:assess_123",
                "customer_id": "customer:cust_acme",
                "framework_id": "regulation:IEC_62443_3_3",
                "created_at": "2026-05-23T22:47:00Z"
            }
        ]

        response = client.get("/api/assessments?customer_id=cust_acme")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "assessment:assess_123"

    @patch("api.routers.assessments.repo_query")
    @patch("api.routers.assessments.repo_create")
    def test_create_session(self, mock_repo_create, mock_repo_query, client):
        """Test POST /api/assessments/{id}/sessions creates a session milestone."""
        # Mock assessment link lookup
        mock_repo_query.side_effect = [
            [{"id": "assessment:assess_123", "framework_id": "regulation:IEC_62443_3_3"}]
        ]

        mock_repo_create.return_value = {
            "id": "assessment_session:sess_q1",
            "assessment_id": "assessment:assess_123",
            "session_name": "Q1 2026 Baseline",
            "created_at": "2026-05-23T22:47:00Z",
            "completed_at": None,
            "status": "IN_PROGRESS",
            "version_lock": "regulation:IEC_62443_3_3"
        }

        response = client.post("/api/assessments/assess_123/sessions", json={
            "session_name": "Q1 2026 Baseline",
            "carry_forward_prior": False
        })

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "assessment_session:sess_q1"
        assert data["session_name"] == "Q1 2026 Baseline"
        assert data["status"] == "IN_PROGRESS"

    @patch("api.routers.assessments.repo_query")
    def test_get_session_questions(self, mock_repo_query, client):
        """Test GET /api/sessions/{session_id}/questions returns framework questions and answers."""
        # 1st: session check, 2nd: questions list, 3rd: answers list
        mock_repo_query.side_effect = [
            [{"id": "assessment_session:sess_q1", "version_lock": "regulation:IEC_62443_3_3"}],  # session lookup
            [
                {
                    "id": "question:IEC_62443_3_3_Q1",
                    "regulation_id": "regulation:IEC_62443_3_3",
                    "standard_code": "SR 5.1",
                    "question_text": "Are firewalls placed at boundary crossings?",
                    "description": "Boundary firewalls",
                    "purdue_level": 4,
                    "category": "Boundary Protection"
                }
            ],  # questions lookup
            [
                {
                    "id": "assessment_answer:ans_1",
                    "session_id": "assessment_session:sess_q1",
                    "question_id": "question:IEC_62443_3_3_Q1",
                    "answer": "Y",
                    "comments": "Configured on main DMZ",
                    "evidence_url": "https://s3.com/dmz.cfg",
                    "updated_at": "2026-05-23T22:47:00Z"
                }
            ]  # answers lookup
        ]

        response = client.get("/api/sessions/sess_q1/questions")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 1
        assert data[0]["question_id"] == "question:IEC_62443_3_3_Q1"
        assert data[0]["standard_code"] == "SR 5.1"
        assert data[0]["answer"] == "Y"
        assert data[0]["comments"] == "Configured on main DMZ"

    @patch("api.routers.assessments.repo_query")
    @patch("api.routers.assessments.repo_create")
    @patch("api.routers.assessments.repo_update")
    def test_update_answer(self, mock_repo_update, mock_repo_create, mock_repo_query, client):
        """Test PATCH /api/sessions/{session_id}/answers/{question_id} updates or inserts answers."""
        # 1st: check session is active, 2nd: lookup existing answer (none)
        mock_repo_query.side_effect = [
            [{"id": "assessment_session:sess_q1", "status": "IN_PROGRESS"}],  # active session check
            []  # no existing answer
        ]

        mock_repo_create.return_value = {
            "id": "assessment_answer:ans_1",
            "session_id": "assessment_session:sess_q1",
            "question_id": "question:IEC_62443_3_3_Q1",
            "answer": "Y",
            "comments": "Fixed",
            "evidence_url": "evidence",
            "updated_at": "2026-05-23T22:47:00Z"
        }

        response = client.patch(
            "/api/sessions/sess_q1/answers/IEC_62443_3_3_Q1",
            json={"answer": "Y", "comments": "Fixed", "evidence_url": "evidence"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Y"
        assert data["comments"] == "Fixed"

    @patch("api.routers.assessments.repo_query")
    def test_get_session_report(self, mock_repo_query, client):
        """Test GET /api/sessions/{session_id}/report calculates scoring and prioritizing correctly."""
        # 1st: session check, 2nd: questions check, 3rd: answers check
        mock_repo_query.side_effect = [
            [{"id": "assessment_session:sess_q1", "session_name": "Q1 2026 Baseline", "version_lock": "regulation:IEC_62443_3_3"}],  # session
            [
                {
                    "id": "question:Q1",
                    "standard_code": "SR 1.1",
                    "question_text": "Q1 Text",
                    "description": "Desc",
                    "purdue_level": 2,
                    "category": "Access Control"
                },
                {
                    "id": "question:Q2",
                    "standard_code": "SR 1.2",
                    "question_text": "Q2 Text",
                    "description": "Desc",
                    "purdue_level": 4,
                    "category": "Boundary Protection"
                }
            ],  # 2 questions
            [
                {
                    "id": "answer:1",
                    "question_id": "question:Q1",
                    "answer": "Y"
                },
                {
                    "id": "answer:2",
                    "question_id": "question:Q2",
                    "answer": "N"
                }
            ]  # 1 YES, 1 NO
        ]

        response = client.get("/api/sessions/sess_q1/report")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats
        assert data["stats"]["total_questions"] == 2
        assert data["stats"]["answered_count"] == 2
        assert data["stats"]["yes_count"] == 1
        assert data["stats"]["no_count"] == 1
        assert data["stats"]["compliance_score"] == 50.0
        
        # Verify categories
        assert len(data["category_coverage"]) == 2
        assert data["category_coverage"][0]["category"] in ["Access Control", "Boundary Protection"]
        
        # Verify prioritized recommendations (Q2 was answered NO, purdue level 4 = Medium priority)
        assert len(data["prioritized_recommendations"]) == 1
        assert data["prioritized_recommendations"][0]["question_id"] == "question:Q2"
        assert data["prioritized_recommendations"][0]["priority"] == "Medium"
