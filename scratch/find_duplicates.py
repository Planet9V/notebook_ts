import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query


async def main():
    try:
        res = await repo_query("SELECT id, regulation_id, description FROM question")
        print("Total questions checked:", len(res))
        dup_count = 0
        for q in res:
            desc = q.get("description") or ""
            count = desc.count("TECHNICAL REFERENCE MANUAL & CISA GUIDELINES:")
            if count > 1:
                dup_count += 1
                print(f"Duplicate found in question {q['id']} for regulation {q['regulation_id']}! Count: {count}")
                print(repr(desc[:300]))
                print("...")
        print("Total duplicate descriptions in DB:", dup_count)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
