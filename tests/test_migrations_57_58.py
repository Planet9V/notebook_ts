"""Test that migrations 57 (entity_link) and 58 (notification) work as expected."""
import asyncio

from open_notebook.database.repository import (
    ensure_record_id,
    repo_create,
    repo_delete,
    repo_query,
    repo_relate,
)


def test_entity_link_schema():
    """Migration 57: Verify entity_link table accepts valid relations and defaults created field."""
    # Create two dummy notes to link
    note1 = asyncio.run(repo_create("note", {"title": "note 1", "content": "c1"}))[0]
    note2 = asyncio.run(repo_create("note", {"title": "note 2", "content": "c2"}))[0]
    
    note1_id = note1["id"]
    note2_id = note2["id"]
    
    try:
        # Create relation link using repo_relate
        link_record = asyncio.run(repo_relate(
            note1_id,
            "entity_link",
            note2_id,
            {"link_type": "references"}
        ))[0]
        link_id = link_record["id"]
        
        try:
            # Query the relationship directly from the record ID
            res = asyncio.run(repo_query("SELECT *, in, out, link_type, created FROM $id", {"id": ensure_record_id(link_id)}))
            assert len(res) > 0
            assert res[0]["in"] == note1_id
            assert res[0]["out"] == note2_id
            assert res[0]["link_type"] == "references"
            assert "created" in res[0]
        finally:
            asyncio.run(repo_delete(link_id))
    finally:
        asyncio.run(repo_delete(note1_id))
        asyncio.run(repo_delete(note2_id))


def test_notification_schema():
    """Migration 58: Verify notification table schema matches definition."""
    # Create dummy user to link notification to
    user = asyncio.run(repo_create("user", {
        "email": "notify_test@example.com",
        "first_name": "Notify",
        "last_name": "Test",
        "username": "notify_test",
        "role": "editor",
        "is_active": True
    }))[0]
    user_id = user["id"]
    
    try:
        # Create notification record using ensure_record_id for user_id
        notif = asyncio.run(repo_create("notification", {
            "user_id": ensure_record_id(user_id),
            "type": "mention",
            "title": "You were mentioned",
            "body": "Test body",
            "entity_id": "note:test",
            "entity_type": "note",
            "is_read": False
        }))[0]
        notif_id = notif["id"]
        
        try:
            # Query notification directly from the record ID
            res = asyncio.run(repo_query("SELECT * FROM $id", {"id": ensure_record_id(notif_id)}))
            assert len(res) > 0
            assert res[0]["user_id"] == user_id
            assert res[0]["type"] == "mention"
            assert res[0]["title"] == "You were mentioned"
            assert res[0]["body"] == "Test body"
            assert res[0]["entity_id"] == "note:test"
            assert res[0]["entity_type"] == "note"
            assert res[0]["is_read"] is False
            assert "created" in res[0]
        finally:
            asyncio.run(repo_delete(notif_id))
    finally:
        asyncio.run(repo_delete(user_id))
