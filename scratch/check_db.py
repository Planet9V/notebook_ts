import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    try:
        tables = await repo_query("INFO FOR DB;")
        print("DB Info:", tables)
        
        users = await repo_query("SELECT * FROM user;")
        print("Users:", users)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
