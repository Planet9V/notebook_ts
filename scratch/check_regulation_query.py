import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.getcwd())

from open_notebook.database.repository import repo_query, ensure_record_id

async def test_query(regulation_id: str):
    print(f"Testing queries for: {regulation_id}")
    # Format 1: Exact record match
    target_id = ensure_record_id(regulation_id)
    res_record = await repo_query(
        "SELECT * FROM question WHERE regulation_id = $id LIMIT 2",
        {"id": target_id}
    )
    print(f"  Format 1 (RecordID object): Found {len(res_record)} records")
    
    # Format 2: string comparison
    res_str = await repo_query(
        "SELECT * FROM question WHERE type::string(regulation_id) = type::string($id) LIMIT 2",
        {"id": regulation_id}
    )
    print(f"  Format 2 (string match): Found {len(res_str)} records")
    
    # Format 3: simple string match if storing raw string
    res_raw = await repo_query(
        "SELECT * FROM question WHERE regulation_id = $id LIMIT 2",
        {"id": regulation_id}
    )
    print(f"  Format 3 (raw string): Found {len(res_raw)} records")

async def main():
    # Test SP800_82_V3
    await test_query("regulation:SP800_82_V3")
    await test_query("SP800_82_V3")
    
    # Test ISA_62443
    await test_query("regulation:ISA_62443")

if __name__ == "__main__":
    asyncio.run(main())
