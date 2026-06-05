import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

# Set up environment variables
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

from open_notebook.database.repository import repo_query

async def main():
    cid = "customer:o9xp6yesfb84jwyxar67"
    clean = "o9xp6yesfb84jwyxar67"
    
    print("Query 1: customer_id = $cid")
    q1 = await repo_query("SELECT id, first_name, last_name, customer_id FROM contact WHERE customer_id = $cid OR customer_id = $clean;", {"cid": cid, "clean": clean})
    print(f"Results: {len(q1)}")
    for r in q1:
        print(f"  {r.get('id')}: {r.get('first_name')} {r.get('last_name')}, customer_id={r.get('customer_id')} (type={type(r.get('customer_id'))})")
        
    print("\nQuery 2: type::string(customer_id) = type::string($cid)")
    q2 = await repo_query("SELECT id, first_name, last_name, customer_id FROM contact WHERE type::string(customer_id) = type::string($cid) OR type::string(customer_id) = type::string($clean);", {"cid": cid, "clean": clean})
    print(f"Results: {len(q2)}")
    for r in q2:
        print(f"  {r.get('id')}: {r.get('first_name')} {r.get('last_name')}, customer_id={r.get('customer_id')} (type={type(r.get('customer_id'))})")

if __name__ == "__main__":
    asyncio.run(main())
