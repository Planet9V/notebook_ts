"""Test Migration 56: assigned_to_user FK field on project and notebook."""
import asyncio
import os
import pytest
from open_notebook.database.repository import repo_create, repo_delete, repo_query, ensure_record_id

# Set environment variables BEFORE importing any app code
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

def test_assigned_to_user_fk_field_exists():
    """Migration 56: assigned_to_user must accept record<user>."""
    # Create test user
    import uuid
    username = f"assignee_{uuid.uuid4().hex[:8]}"
    user_res = asyncio.run(repo_create("user", {
        "username": username,
    }))
    assert len(user_res) > 0
    user_id = user_res[0]["id"]
    user_rid = ensure_record_id(user_id)
    
    # Create notebook and project assigned to user_id
    notebook_res = asyncio.run(repo_create("notebook", {
        "name": "assigned test notebook",
        "assigned_to_user": user_rid,
    }))
    project_res = asyncio.run(repo_create("project", {
        "name": "assigned test project",
        "assigned_to_user": user_rid,
    }))
    
    assert len(notebook_res) > 0 and len(project_res) > 0
    notebook_id = notebook_res[0]["id"]
    project_id = project_res[0]["id"]
    
    try:
        # Verify fields match
        nb_query = asyncio.run(repo_query(f"SELECT assigned_to_user FROM {notebook_id};"))
        pr_query = asyncio.run(repo_query(f"SELECT assigned_to_user FROM {project_id};"))
        
        assert nb_query[0]["assigned_to_user"] == user_id
        assert pr_query[0]["assigned_to_user"] == user_id
        
    finally:
        asyncio.run(repo_delete(user_id))
        asyncio.run(repo_delete(notebook_id))
        asyncio.run(repo_delete(project_id))
