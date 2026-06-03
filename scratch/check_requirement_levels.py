import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    print("Checking columns in REQUIREMENT_LEVELS:")
    try:
        cols = run_mssql_json_query(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'REQUIREMENT_LEVELS';"
        )
        for c in cols:
            print(f"  {c['COLUMN_NAME']}: {c['DATA_TYPE']}")
    except Exception as e:
        print("Error:", e)
        
    print("\nChecking sample rows in REQUIREMENT_LEVELS:")
    try:
        rows = run_mssql_json_query(
            "SELECT TOP 5 * FROM REQUIREMENT_LEVELS;"
        )
        print(json.dumps(rows, indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
