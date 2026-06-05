import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import ensure_record_id, repo_query

async def main():
    raw_id = "notebook:⟨test-nb-999⟩"
    rec_id = ensure_record_id(raw_id)
    print("Parsed RecordID:", repr(rec_id))
    
    # Try querying using repo_query
    try:
        res = await repo_query("SELECT * FROM $id", {"id": rec_id})
        print("Query with parsed ID result:", res)
    except Exception as e:
        print("Query with parsed ID failed:", e)

    # Try querying using raw string without ensure_record_id
    try:
        res2 = await repo_query("SELECT * FROM $id", {"id": raw_id})
        print("Query with raw string result:", res2)
    except Exception as e:
        print("Query with raw string failed:", e)

    # Let's query using direct string injection to see if it works
    try:
        res3 = await repo_query("SELECT * FROM notebook WHERE id = $id", {"id": rec_id})
        print("Query where id = rec_id result:", res3)
    except Exception as e:
        print("Query where id = rec_id failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
