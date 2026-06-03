import asyncio
from cset_db_pure_sync import run_mssql_json_query

async def run():
    queries = {
        "DIAGRAM_CONTAINER": "SELECT TOP 2 * FROM DIAGRAM_CONTAINER",
        "ASSESSMENT_DIAGRAM_COMPONENTS": "SELECT TOP 2 * FROM ASSESSMENT_DIAGRAM_COMPONENTS",
        "COMPONENT_SYMBOLS": "SELECT TOP 2 * FROM COMPONENT_SYMBOLS",
        "DIAGRAM_CONTAINER_TYPES": "SELECT TOP 2 * FROM DIAGRAM_CONTAINER_TYPES"
    }
    for name, q in queries.items():
        try:
            res = run_mssql_json_query(q)
            print(f"=== {name} ===")
            print(res)
            print()
        except Exception as e:
            print(f"Error executing {name}: {e}")

if __name__ == "__main__":
    asyncio.run(run())
