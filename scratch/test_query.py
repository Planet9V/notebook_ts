import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query, ensure_record_id, db_connection

async def main():
    async with db_connection() as db:
        # 1. Let's query one question
        res = await db.query("SELECT id, regulation_id FROM question LIMIT 1")
        print("Raw query result from driver:")
        print(res)
        if res and len(res) > 0:
            q = res[0]
            print("Type of id:", type(q.get("id")))
            print("Type of regulation_id:", type(q.get("regulation_id")))
            print("Value of regulation_id:", q.get("regulation_id"))

        # 2. Try querying using record ID vs string literal vs type::record
        target_id_str = "regulation:NIST_800_82"
        target_id_record = ensure_record_id(target_id_str)
        
        # Test A: WHERE regulation_id = $id (with record ID object)
        res_a = await db.query("SELECT count() FROM question WHERE regulation_id = $id GROUP ALL", {"id": target_id_record})
        print("Test A (record ID object parameter):", res_a)

        # Test B: WHERE regulation_id = $id (with string parameter)
        res_b = await db.query("SELECT count() FROM question WHERE regulation_id = $id GROUP ALL", {"id": target_id_str})
        print("Test B (string parameter):", res_b)

        # Test C: WHERE regulation_id = type::record($id) (with string parameter)
        res_c = await db.query("SELECT count() FROM question WHERE regulation_id = type::record($id) GROUP ALL", {"id": target_id_str})
        print("Test C (type::record cast of string parameter):", res_c)

        # Test D: WHERE regulation_id = $id (with str(record_id) parameter)
        res_d = await db.query("SELECT count() FROM question WHERE regulation_id = $id GROUP ALL", {"id": str(target_id_record)})
        print("Test D (str(record_id) parameter):", res_d)

if __name__ == "__main__":
    asyncio.run(main())
