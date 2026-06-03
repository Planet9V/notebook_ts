import json
import urllib.request
from collections import Counter


def main():
    url = "http://localhost:5055/api/regulations/IEC_62443_3_3/questions"
    try:
        req = urllib.request.Request(url)
        # Exclude password middleware by checking if we need authorization or if it's open
        # Wait, the PasswordAuthMiddleware is active on all /api routes except health, config, auth/status.
        # Let's see if we need a token or if we can query SurrealDB directly (which we did earlier).
        pass
    except Exception as e:
        print("API query error:", e)

if __name__ == "__main__":
    # Actually let's query SurrealDB directly as we did before, but check for EVERY regulation in the database.
    import asyncio
    import os
    import sys

    from dotenv import load_dotenv
    load_dotenv()
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from open_notebook.database.repository import repo_query

    async def run():
        res = await repo_query("SELECT regulation_id, category, count() FROM question GROUP BY regulation_id, category")
        
        # Let's count how many questions are in each category per regulation
        reg_cat_counts = {}
        for row in res:
            reg_id = row.get("regulation_id")
            category = row.get("category")
            count = row.get("count")
            if reg_id not in reg_cat_counts:
                reg_cat_counts[reg_id] = []
            reg_cat_counts[reg_id].append((category, count))
            
        print("Total regulations with questions in DB:", len(reg_cat_counts))
        
        # Print a few that only have 1 question per category or check if they exist
        for reg_id, cats in list(reg_cat_counts.items())[:10]:
            print(f"\nRegulation: {reg_id}")
            for cat, count in cats:
                print(f"  Category: '{cat}' -> {count} questions")
                
    asyncio.run(run())
