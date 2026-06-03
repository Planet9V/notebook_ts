import asyncio
from cset_db_pure_sync import run_mssql_json_query

async def run():
    tables = [
        "ASSESSMENT_DIAGRAM_COMPONENTS",
        "DIAGRAM_CONTAINER",
        "DIAGRAM_CONTAINER_TYPES",
        "DIAGRAM_OBJECT_TYPES",
        "DIAGRAM_TEMPLATES",
        "DIAGRAM_TYPES",
        "COMPONENT_SYMBOLS",
        "SYMBOL_GROUPS",
        "SHAPE_TYPES",
        "ASSESSMENTS"
    ]
    for t in tables:
        try:
            res = run_mssql_json_query(f"SELECT COUNT(*) as cnt FROM {t}")
            print(f"{t}: {res[0].get('cnt') if res else 0} rows")
        except Exception as e:
            print(f"Error querying {t}: {e}")

if __name__ == "__main__":
    asyncio.run(run())
