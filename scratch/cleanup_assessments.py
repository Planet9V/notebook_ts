import asyncio
import os
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    print("Deleting all assessment answers...")
    await repo_query("DELETE assessment_answer")
    print("Deleting all assessment sessions...")
    await repo_query("DELETE assessment_session")
    print("Deleting all assessments...")
    await repo_query("DELETE assessment")
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(main())
