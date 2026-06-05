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
    print("--- NOTEBOOKS ---")
    notebooks = await repo_query("SELECT id, name, customer_id, contacts, suggested_contacts FROM notebook;")
    for n in notebooks:
        print(f"ID: {n.get('id')}, Name: {n.get('name')}, Customer: {n.get('customer_id')}")
        print(f"  Contacts: {n.get('contacts')}")
        print(f"  Suggested Contacts: {n.get('suggested_contacts')}")

if __name__ == "__main__":
    asyncio.run(main())
