import json
import asyncio
from scratch.cset_db_pure_sync import run_mssql_json_query, sanitize_id
from open_notebook.database.repository import repo_query

async def main():
    print("Finding missing questions for CRE+ MIL:")
    cset_qs = run_mssql_json_query(
        "SELECT Mat_Question_Id, Question_Title FROM MATURITY_QUESTIONS WHERE Maturity_Model_Id = 24;"
    )
    cset_ids = {int(q["Mat_Question_Id"]): q["Question_Title"] for q in cset_qs}
    
    surreal_qs = await repo_query(
        "SELECT id FROM question WHERE type::string(regulation_id) = 'regulation:CRE__MIL';"
    )
    surreal_ids = set()
    for q in surreal_qs:
        parts = q["id"].split("_")
        if len(parts) >= 2:
            try:
                surreal_ids.add(int(parts[-1]))
            except ValueError:
                pass
                
    print(f"CSET total: {len(cset_ids)}")
    print(f"SurrealDB total: {len(surreal_ids)}")
    
    missing_ids = set(cset_ids.keys()) - surreal_ids
    print("Missing IDs:", missing_ids)
    for mid in missing_ids:
        print(f"  - ID: {mid} | Title: {cset_ids[mid]}")

if __name__ == "__main__":
    asyncio.run(main())
