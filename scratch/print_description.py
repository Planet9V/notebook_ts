import asyncio
import os
import sys

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query


async def main():
    try:
        # Check descriptions of some questions for NIST_800_82
        res = await repo_query("SELECT id, description FROM question WHERE regulation_id = 'regulation:NIST_800_82' LIMIT 3")
        for q in res:
            print(f"Question ID: {q['id']}")
            print("Description:")
            print(q.get("description"))
            print("-" * 50)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
