import json
import os
import sys
import urllib.request

from dotenv import load_dotenv

load_dotenv()

def main():
    # Fetch API status or try to login to get a token if PasswordAuthMiddleware is active
    username = os.environ.get("BASIC_AUTH_USERNAME", "admin")
    password = os.environ.get("BASIC_AUTH_PASSWORD", "secret")
    
    # Let's bypass the password middleware by using an HTTP handler with basic auth if needed,
    # or let's check if the API is accessible without auth for localhost or if it uses PasswordAuthMiddleware.
    # Actually, PasswordAuthMiddleware in api/auth.py uses standard token or session cookies.
    # Let's see if we can do basic auth or if it requires a post to /api/auth/login.
    print("Testing backend questions endpoint directly...")
    
    import asyncio
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from open_notebook.database.repository import repo_query
    
    async def run():
        # Let's query the database directly for all questions and see if any have "TECHNICAL REFERENCE MANUAL" twice
        res = await repo_query("SELECT id, description FROM question")
        dups = 0
        for q in res:
            desc = q.get("description") or ""
            if desc.count("TECHNICAL REFERENCE MANUAL") > 1:
                dups += 1
                print(f"Dup in DB: {q['id']} - count: {desc.count('TECHNICAL REFERENCE MANUAL')}")
        print("Total duplicates found directly in DB questions:", dups)
        
    asyncio.run(run())

if __name__ == "__main__":
    main()
