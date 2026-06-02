from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.asyncio
@patch("api.routers.assessments.repo_query")
@patch("api.routers.assessments.repo_update")
async def test_session_complete_snapshot(mock_repo_update, mock_repo_query):
    # Mock session lookup
    mock_repo_query.side_effect = [
        # 1. sess_check in complete_session
        [{
            "id": "assessment_session:sess_q1",
            "assessment_id": "assessment:assess_123",
            "session_name": "Q1 2026 Baseline",
            "created_at": "2026-05-23T22:47:00Z",
            "completed_at": None,
            "status": "IN_PROGRESS",
            "version_lock": "regulation:IEC_62443_3_3"
        }],
        # 2. repo_query for questions in metrics calculation
        [
            {
                "id": "question:Q1",
                "regulation_id": "regulation:IEC_62443_3_3",
                "standard_code": "SR 1.1",
                "question_text": "Q1 Text",
                "description": "Desc",
                "purdue_level": 2,
                "category": "Access Control"
            },
            {
                "id": "question:Q2",
                "regulation_id": "regulation:IEC_62443_3_3",
                "standard_code": "SR 1.2",
                "question_text": "Q2 Text",
                "description": "Desc",
                "purdue_level": 4,
                "category": "Boundary Protection"
            }
        ],
        # 3. repo_query for answers in metrics calculation
        [
            {
                "id": "answer:1",
                "session_id": "assessment_session:sess_q1",
                "question_id": "question:Q1",
                "answer": "Y"
            },
            {
                "id": "answer:2",
                "session_id": "assessment_session:sess_q1",
                "question_id": "question:Q2",
                "answer": "N"
            }
        ]
    ]

    # Mock database update response
    mock_repo_update.return_value = {
        "id": "assessment_session:sess_q1",
        "assessment_id": "assessment:assess_123",
        "session_name": "Q1 2026 Baseline",
        "created_at": "2026-05-23T22:47:00Z",
        "completed_at": "2026-06-02T12:00:00Z",
        "status": "COMPLETED",
        "version_lock": "regulation:IEC_62443_3_3",
        "compliance_snapshot": {
            "compliance_score": 50.0,
            "total_questions": 2,
            "answered_count": 2,
            "yes_count": 1,
            "no_count": 1,
            "na_count": 0,
            "alt_count": 0,
            "category_coverage": [
                {
                    "category": "Access Control",
                    "total": 1,
                    "answered": 1,
                    "yes_count": 1,
                    "score": 100.0
                },
                {
                    "category": "Boundary Protection",
                    "total": 1,
                    "answered": 1,
                    "yes_count": 0,
                    "score": 0.0
                }
            ]
        }
    }

    response = client.post("/api/sessions/sess_q1/complete")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["completed_at"] is not None
    assert "compliance_snapshot" in data
    assert data["compliance_snapshot"] is not None
    assert data["compliance_snapshot"]["compliance_score"] == 50.0
    assert len(data["compliance_snapshot"]["category_coverage"]) == 2
