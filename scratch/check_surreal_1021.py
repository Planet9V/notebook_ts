import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    res = await repo_query("SELECT * FROM question WHERE id = 'question:CRE__MIL_mat_1021';")
    print("SurrealDB response:")
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
