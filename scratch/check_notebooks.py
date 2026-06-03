import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    try:
        notebooks = await repo_query("SELECT id, name, description, archived FROM notebook")
        print("Notebooks:")
        for nb in notebooks:
            print(nb)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
