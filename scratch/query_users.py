import asyncio
from cset_db_pure_sync import run_mssql_json_query

async def run():
    try:
        users = run_mssql_json_query("SELECT * FROM USERS")
        print("Users in CSET:")
        print(users)
    except Exception as e:
        print(f"Error querying USERS: {e}")

if __name__ == "__main__":
    asyncio.run(run())
