"""Test Migration 55: task_relation RELATION table existence and connectivity."""
import asyncio
import os
import pytest
from open_notebook.database.repository import repo_create, repo_delete, repo_query, repo_relate

# Set environment variables BEFORE importing any app code
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

def test_task_relation_table_exists_and_connects():
    """Migration 55: task_relation RELATION table must allow relating a task to a notebook."""
    # Create test task and test notebook
    task_res = asyncio.run(repo_create("task", {
        "title": "relation test task",
        "status": "todo",
    }))
    notebook_res = asyncio.run(repo_create("notebook", {
        "name": "relation test notebook",
    }))
    
    assert len(task_res) > 0 and len(notebook_res) > 0
    task_id = task_res[0]["id"]
    notebook_id = notebook_res[0]["id"]
    
    try:
        # Create relation
        rel_res = asyncio.run(repo_relate(task_id, "task_relation", notebook_id))
        assert len(rel_res) > 0
        
        # Verify relation exists
        query_res = asyncio.run(repo_query(f"SELECT * FROM task_relation WHERE in = {task_id};"))
        assert len(query_res) > 0
        assert query_res[0]["out"] == notebook_id
        
    finally:
        asyncio.run(repo_delete(task_id))
        asyncio.run(repo_delete(notebook_id))
