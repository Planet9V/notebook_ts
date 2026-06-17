"""Test Note Markdown-to-Tiptap HTML block migration script."""
import asyncio
from open_notebook.database.repository import repo_create, repo_delete, repo_query, ensure_record_id
from scripts.migrate_notes_to_tiptap import migrate_notes

def test_note_migration_and_idempotence():
    """Verify that migrate_notes renders markdown to HTML, sets backups, and is idempotent."""
    # Create test markdown note
    test_note = asyncio.run(repo_create("note", {
        "title": "migration test note",
        "content": "# Test Header\n\nThis is a *markdown* test note.",
        "content_format": "markdown"
    }))[0]
    note_id = test_note["id"]
    
    try:
        # Run migration script logic
        asyncio.run(migrate_notes())
        
        # Verify note is migrated
        res1 = asyncio.run(repo_query("SELECT * FROM $id", {"id": ensure_record_id(note_id)}))
        assert len(res1) > 0
        assert res1[0]["content_format"] == "block"
        assert res1[0]["content_markdown_backup"] == "# Test Header\n\nThis is a *markdown* test note."
        assert "<h1>Test Header</h1>" in res1[0]["content"]
        assert "<p>This is a <em>markdown</em> test note.</p>" in res1[0]["content"]
        
        # Run migration again to verify idempotency
        asyncio.run(migrate_notes())
        
        # Verify nothing changed
        res2 = asyncio.run(repo_query("SELECT * FROM $id", {"id": ensure_record_id(note_id)}))
        assert res2[0]["content_format"] == "block"
        assert res2[0]["content"] == res1[0]["content"]
        assert res2[0]["content_markdown_backup"] == res1[0]["content_markdown_backup"]
        
    finally:
        asyncio.run(repo_delete(note_id))
