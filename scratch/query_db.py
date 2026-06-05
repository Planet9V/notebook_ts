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
    print("--- CUSTOMERS ---")
    customers = await repo_query("SELECT id, name FROM customer;")
    for c in customers:
        print(f"ID: {c.get('id')}, Name: {c.get('name')}")
    
    print("\n--- CONTACTS ---")
    contacts = await repo_query("SELECT id, first_name, last_name, customer_id, location_id, email FROM contact;")
    for c in contacts:
        print(f"ID: {c.get('id')}, Name: {c.get('first_name')} {c.get('last_name')}, Customer: {c.get('customer_id')}, Location: {c.get('location_id')}, Email: {c.get('email')}")

if __name__ == "__main__":
    asyncio.run(main())
