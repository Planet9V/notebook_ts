import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    try:
        # Fetch all regulations
        regs = await repo_query("SELECT id, name FROM regulation")
        print(f"Total regulations: {len(regs)}")
        
        print("\n--- Search results for critical frameworks ---")
        keywords = ["62443", "cfats", "800-82", "tsa", "nist", "isa"]
        for keyword in keywords:
            matches = [r for r in regs if keyword.lower() in r['id'].lower() or keyword.lower() in r['name'].lower()]
            print(f"\nKeyword '{keyword}' matches:")
            for m in matches:
                print(f"  ID: {m['id']}  Name: {m['name']}")
                
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
