import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    try:
        # Query one question from IEC_62443_3_3
        res = await repo_query("SELECT description FROM question WHERE regulation_id = 'regulation:IEC_62443_3_3' LIMIT 1")
        if res:
            print("Question description in DB:")
            print(repr(res[0]["description"]))
            
        # Query one question from ACSC_ESSENTIAL_8
        res2 = await repo_query("SELECT description FROM question WHERE regulation_id = 'regulation:ACSC_ESSENTIAL_8' LIMIT 1")
        if res2:
            print("ACSC question description in DB:")
            print(repr(res2[0]["description"]))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
