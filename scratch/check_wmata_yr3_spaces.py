import asyncio
from dotenv import load_dotenv
load_dotenv()
from open_notebook.database.repository import repo_query

async def main():
    print("Checking for WMATAYR3 or WMATA_YR3 in SurrealDB:")
    res_qs = await repo_query("SELECT id, regulation_id FROM question WHERE type::string(id) CONTAINS 'WMATA';")
    print(f"Total questions found with 'WMATA' in ID: {len(res_qs)}")
    
    sets_found = set()
    for q in res_qs:
        sets_found.add(q["regulation_id"])
        
    print("Unique regulation IDs found:")
    print(sets_found)

if __name__ == "__main__":
    asyncio.run(main())
