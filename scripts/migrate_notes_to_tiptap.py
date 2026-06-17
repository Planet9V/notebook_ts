"""
One-time migration script: converts existing Markdown notes to Tiptap HTML block format.
Run AFTER migration 51 is applied.
Safe to re-run (idempotent).
"""
import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure SurrealDB connection details
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

from open_notebook.database.repository import repo_query, repo_upsert
from markdown_it import MarkdownIt

async def migrate_notes():
    try:
        # Retrieve all notes that are not yet in block format
        notes = await repo_query("SELECT id, content, content_format, content_markdown_backup, title, note_type FROM note WHERE content_format != 'block'")
        if not notes:
            print("No notes requiring block conversion found.")
            return

        md = MarkdownIt()
        converted_count = 0
        
        for note in notes:
            note_id = str(note["id"])
            content_format = note.get("content_format") or "markdown"
            
            # Skip if already 'block'
            if content_format == "block":
                continue
                
            content = note.get("content") or ""
            
            # Skip if note is empty
            if not content.strip():
                continue
                
            print(f"Migrating note {note_id} ('{note.get('title') or 'Untitled'}')...")
            
            # Backup current markdown
            backup = content
            
            # Render Markdown to HTML string
            html_content = md.render(content)
            
            # Update note in SurrealDB
            # We construct a update dict, preserving all other fields
            update_data = {
                "title": note.get("title"),
                "note_type": note.get("note_type"),
                "content": html_content,
                "content_format": "block",
                "content_markdown_backup": backup
            }
            
            await repo_upsert("note", note_id, update_data)
            converted_count += 1
            
        print(f"Successfully converted {converted_count} notes to Tiptap HTML block format.")
    except Exception as e:
        print(f"Error converting notes: {e}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(migrate_notes())
