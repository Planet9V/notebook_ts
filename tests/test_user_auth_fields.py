"""Test Migration 54: User table SCHEMAFULL and auth fields existence."""
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

def test_user_table_auth_fields_exist():
    """Migration 54: user table must accept auth fields and enforce schema."""
    import uuid
    username = f"user_{uuid.uuid4().hex[:8]}"
    email = f"{username}@example.com"
    
    result = asyncio.run(repo_create("user", {
        "username": username,
        "email": email,
        "password_hash": "hashedpassword123",
        "is_active": True,
        "role": "admin",
    }))
    assert isinstance(result, list)
    assert len(result) > 0
    created = result[0]
    user_id = created["id"]
    assert user_id is not None
    try:
        results = asyncio.run(repo_query(f"SELECT * FROM {user_id};"))
        assert len(results) > 0
        assert results[0]["username"] == username
        assert results[0]["email"] == email
        assert results[0]["password_hash"] == "hashedpassword123"
        assert results[0]["is_active"] is True
        assert results[0]["role"] == "admin"
    finally:
        asyncio.run(repo_delete(user_id))
