import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    try:
        # Get unique regulation_id from question table
        results = await repo_query("SELECT regulation_id, count() FROM question GROUP BY regulation_id")
        print("Unique regulation IDs in question table:")
        for r in results:
            # Fetch regulation details
            reg_id = r['regulation_id']
            # Sometimes regulation_id in question doesn't have the "regulation:" prefix, let's query both
            db_id = reg_id if ":" in reg_id else f"regulation:{reg_id}"
            reg_details = await repo_query("SELECT id, name FROM regulation WHERE id = $id", {"id": db_id})
            reg_name = reg_details[0]['name'] if reg_details else "UNKNOWN"
            print(f"  ID: {reg_id} (DB ID: {db_id}) -> {reg_name} ({r['count']} questions)")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
