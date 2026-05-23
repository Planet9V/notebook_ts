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
        # Check all questions for IEC_62443_3_3
        res = await repo_query("SELECT id, standard_code, category, question_text FROM question WHERE regulation_id = 'regulation:IEC_62443_3_3'")
        print("Number of questions for IEC_62443_3_3 in database:", len(res))
        for q in res:
            print(f"ID: {q['id']} | Code: {q.get('standard_code')} | Category: {q.get('category')} | Text: {q.get('question_text')[:40]}...")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
