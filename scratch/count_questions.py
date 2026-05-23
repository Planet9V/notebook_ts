import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    print("Connecting to SurrealDB...")
    try:
        # Check overall count of questions grouped by regulation and category
        results = await repo_query("SELECT regulation_id, category, count() FROM question GROUP BY regulation_id, category")
        
        # Print results for a few regulations
        regs_map = {}
        for r in results:
            reg_id = r["regulation_id"]
            cat = r["category"]
            cnt = r["count"]
            if reg_id not in regs_map:
                regs_map[reg_id] = []
            regs_map[reg_id].append((cat, cnt))
            
        print("\n--- Questions per category for first 10 regulations ---")
        for reg_id, cats in list(regs_map.items())[:15]:
            print(f"Regulation: {reg_id}")
            for cat, cnt in cats:
                print(f"  - Category: {cat} -> {cnt} checks")
                
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
