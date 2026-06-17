"""Test Migration 53: Campaign table exists and accepts CRUD operations."""
import asyncio
import os
import pytest
from open_notebook.database.repository import repo_create, repo_delete, repo_query

# Set environment variables BEFORE importing any app code
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

def test_campaign_table_exists_and_accepts_create():
    """Migration 53: campaign table must exist and accept CRUD."""
    result = asyncio.run(repo_create("campaign", {
        "name": "test campaign",
        "status": "draft",
        "theme": "Security compliance",
    }))
    assert isinstance(result, list)
    assert len(result) > 0
    created = result[0]
    campaign_id = created["id"]
    assert campaign_id is not None
    try:
        results = asyncio.run(repo_query(f"SELECT * FROM {campaign_id};"))
        assert len(results) > 0
        assert results[0]["name"] == "test campaign"
        assert results[0]["status"] == "draft"
        assert results[0]["theme"] == "Security compliance"
    finally:
        asyncio.run(repo_delete(campaign_id))
