import asyncio
from cset_db_pure_sync import run_mssql_json_query

async def run():
    try:
        tables = run_mssql_json_query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
        )
        print("Tables in CSET Database:")
        for t in tables:
            print(f"- {t.get('TABLE_NAME')}")
    except Exception as e:
        print(f"Error querying INFORMATION_SCHEMA: {e}")

if __name__ == "__main__":
    asyncio.run(run())
