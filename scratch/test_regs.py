import asyncio
import os
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    print("Checking regulation:NIS2 in regulation table:")
    res = await repo_query("SELECT id, name FROM regulation WHERE id = regulation:NIS2")
    print(res)

    print("Checking questions count for regulation:NIS2:")
    q_count = await repo_query("SELECT count() FROM question WHERE regulation_id = 'regulation:NIS2'")
    print(q_count)

    print("Checking questions count for regulation:Universal:")
    u_count = await repo_query("SELECT count() FROM question WHERE regulation_id = 'regulation:Universal'")
    print(u_count)

if __name__ == "__main__":
    asyncio.run(main())
