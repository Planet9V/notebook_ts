"""Test that content_format defaults to 'markdown' on new notes."""
import asyncio

from open_notebook.database.repository import repo_create, repo_delete, repo_query


def test_note_content_format_defaults_to_markdown():
    """Migration 51: content_format field defaults to 'markdown'."""
    # Create a note without specifying content_format
    records = asyncio.run(repo_create("note", {"title": "test", "content": "hello"}))
    note_id = records[0]["id"]
    try:
        results = asyncio.run(repo_query(f"SELECT content_format FROM {note_id};"))
        assert results[0]["content_format"] == "markdown", (
            f"Expected 'markdown', got {results[0]['content_format']}"
        )
    finally:
        asyncio.run(repo_delete(note_id))
