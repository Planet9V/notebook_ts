import asyncio
from dotenv import load_dotenv
load_dotenv()
from open_notebook.database.repository import repo_query

async def main():
    try:
        res = await repo_query("SELECT * FROM episode;")
        print("Episodes:")
        import json
        print(json.dumps(res, indent=2, default=str))
    except Exception as e:
        print("Error querying episode:", e)

if __name__ == "__main__":
    asyncio.run(main())
