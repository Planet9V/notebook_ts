import asyncio
from dotenv import load_dotenv
load_dotenv()
from open_notebook.database.repository import repo_query

async def main():
    try:
        q_count = await repo_query("SELECT count() FROM question GROUP ALL;")
        final_q = q_count[0]["count"] if q_count else 0
        print(f"Current Questions (Ingested) Count: {final_q}")
    except Exception as e:
        print("Error querying count:", e)

if __name__ == "__main__":
    asyncio.run(main())
