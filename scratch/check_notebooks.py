import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    res = await repo_query("SELECT id, name FROM notebook")
    print("Notebooks in database:")
    for nb in res:
        print(f"ID: {nb.get('id')} | Name: {nb.get('name')}")

if __name__ == "__main__":
    asyncio.run(main())
