import asyncio
import os

import pytest

# Set environment variables BEFORE importing any app code
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

from open_notebook.database.repository import repo_create, repo_delete, repo_query


def test_task_table_exists_and_accepts_create():
    """Migration 52: task table must exist and accept CRUD."""
    result = asyncio.run(repo_create("task", {
        "title": "test task",
        "status": "todo",
        "priority": "medium",
    }))
    assert isinstance(result, list)
    assert len(result) > 0
    created = result[0]
    task_id = created["id"]
    assert task_id is not None
    try:
        results = asyncio.run(repo_query(f"SELECT * FROM {task_id};"))
        assert len(results) > 0
        assert results[0]["title"] == "test task"
        assert results[0]["status"] == "todo"
    finally:
        asyncio.run(repo_delete(task_id))
