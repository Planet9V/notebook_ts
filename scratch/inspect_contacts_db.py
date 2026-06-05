import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    contacts = await repo_query("SELECT id, first_name, last_name, customer_id, location_id FROM contact")
    print("CONTACTS:")
    for c in contacts:
        print(f"ID: {c.get('id')} | Name: {c.get('first_name')} {c.get('last_name')} | customer_id: {c.get('customer_id')} | location_id: {c.get('location_id')}")

    customers = await repo_query("SELECT id, name FROM customer")
    print("\nCUSTOMERS:")
    for cust in customers:
        print(f"ID: {cust.get('id')} | Name: {cust.get('name')}")

if __name__ == "__main__":
    asyncio.run(main())
