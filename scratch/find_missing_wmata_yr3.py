import json
import asyncio
from scratch.cset_db_pure_sync import run_mssql_json_query, sanitize_id
from open_notebook.database.repository import repo_query

async def main():
    print("Finding missing questions for WMATA YR3:")
    sql = (
        "SELECT q.Question_Id, q.Simple_Question "
        "FROM NEW_QUESTION q "
        "JOIN ("
        "  SELECT Set_Name, Question_Id FROM NEW_QUESTION_SETS "
        "  UNION "
        "  SELECT Set_Name, Question_Id FROM REQUIREMENT_QUESTIONS_SETS"
        ") as s ON q.Question_Id = s.Question_Id "
        "WHERE s.Set_Name = 'WMATA YR3';"
    )
    cset_qs = run_mssql_json_query(sql)
    cset_ids = {int(q["Question_Id"]): q["Simple_Question"] for q in cset_qs}
    
    surreal_qs = await repo_query(
        "SELECT id FROM question WHERE type::string(regulation_id) = 'regulation:WMATA_YR3';"
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
        print(f"  - ID: {mid} | Question: {cset_ids[mid][:60]}")

if __name__ == "__main__":
    asyncio.run(main())
