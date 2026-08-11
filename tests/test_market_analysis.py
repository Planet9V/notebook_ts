import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_market_sizing_calculation():
    payload = {
        "category": "Cybersecurity Audit Software",
        "geography": "North America",
        "target_acv": 20000.0,
        "total_companies": 50000,
        "serviceable_pct": 0.30,
        "obtainable_pct": 0.05
    }
    response = client.post("/api/market-analysis/calculate-sizing", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Cybersecurity Audit Software"
    assert data["tam_millions"] == 1000.0  # (50k * $20k) / 1M = $1000M
    assert data["sam_millions"] == 300.0   # $1000M * 0.30 = $300M
    assert data["som_millions"] == 15.0    # $300M * 0.05 = $15M
    assert data["scenarios"]["conservative_som"] == 7.5
    assert data["scenarios"]["base_som"] == 15.0
    assert data["scenarios"]["optimistic_som"] == 22.5
    assert data["methodology"] == "bottom_up"


def test_prospects_csv_export():
    response = client.get("/api/market-analysis/prospects/csv?industry=Healthcare%20IT")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
    assert "score,company_name,domain" in response.text
    assert "Healthcare IT Partner Alpha" in response.text


def test_prospecting_analysis():
    payload = {
        "industry": "Healthcare IT",
        "company_size_band": "50-500",
        "icp_description": "Hospitals adopting HIPAA compliant cloud workflows",
        "buying_triggers": ["recent_funding", "new_ciso"]
    }
    response = client.post("/api/market-analysis/prospecting", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    assert data[0]["score"] == "Hot"
    assert data[0]["industry"] == "Healthcare IT"


def test_multi_format_content_factory():
    payload = {
        "title": "NIST CSF v2 Compliance Guide",
        "source_text": "NIST CSF v2 introduces the Govern function to emphasize enterprise risk management.",
        "formats": [
            "audio_podcast",
            "product_brochure",
            "pitch_deck",
            "landing_page",
            "linkedin_post",
            "x_thread",
            "ai_proposal"
        ]
    }
    response = client.post("/api/market-analysis/generate-content-factory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "NIST CSF v2 Compliance Guide"
    assert len(data["content_artifacts"]) == 7
    formats = [a["format_type"] for a in data["content_artifacts"]]
    assert "audio_podcast" in formats
    assert "product_brochure" in formats
    assert "pitch_deck" in formats
    assert "linkedin_post" in formats
    assert "x_thread" in formats
    assert "ai_proposal" in formats
