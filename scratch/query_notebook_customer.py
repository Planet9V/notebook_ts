import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    try:
        # Get all notebooks
        notebooks = await repo_query("SELECT id, name, customer_id FROM notebook")
        print("--- Notebooks ---")
        for nb in notebooks:
            print(f"Notebook ID: {nb['id']}  Name: {nb['name']}  Customer ID: {nb.get('customer_id')}")
            
        # Get all customers
        customers = await repo_query("SELECT * FROM customer")
        print("\n--- Customers ---")
        for cust in customers:
            print(f"Customer ID: {cust['id']}  Name: {cust['name']}")
            print(f"  Sectors: {cust.get('sectors')}")
            print(f"  Primary Sector: {cust.get('primary_sector')}")
            print(f"  Assigned Frameworks: {cust.get('assigned_frameworks')}")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
