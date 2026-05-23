import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query, ensure_record_id, db_connection

async def main():
    regulation_id = "NIST_800_82"
    full_id = f"regulation:{regulation_id}" if ":" not in regulation_id else regulation_id
    target_id = ensure_record_id(full_id)
    
    print(f"target_id type: {type(target_id)}")
    print(f"target_id stringified: {str(target_id)}")
    
    async with db_connection() as db:
        reg_check = await db.query("SELECT id FROM regulation WHERE id = $id", {"id": target_id})
        print("Regulation check in DB:", reg_check)
        
        # This is exactly what get_regulation_questions does:
        results = await db.query(
            "SELECT * FROM question WHERE regulation_id = $regulation_id ORDER BY standard_code ASC",
            {"regulation_id": str(target_id)}
        )
        print("Questions count in DB:", len(results) if results else 0)

if __name__ == "__main__":
    asyncio.run(main())
