import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    print("Checking columns in NEW_REQUIREMENT:")
    try:
        cols = run_mssql_json_query(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'NEW_REQUIREMENT';"
        )
        for c in cols:
            print(f"  {c['COLUMN_NAME']}: {c['DATA_TYPE']}")
    except Exception as e:
        print("Error:", e)
        
    print("\nChecking columns in REQUIREMENT_SETS:")
    try:
        cols = run_mssql_json_query(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'REQUIREMENT_SETS';"
        )
        for c in cols:
            print(f"  {c['COLUMN_NAME']}: {c['DATA_TYPE']}")
    except Exception as e:
        print("Error:", e)

    print("\nChecking sample row in REQUIREMENT_SETS:")
    try:
        rows = run_mssql_json_query(
            "SELECT TOP 1 * FROM REQUIREMENT_SETS;"
        )
        print(json.dumps(rows, indent=2))
    except Exception as e:
        print("Error:", e)

    print("\nChecking sample row in NEW_REQUIREMENT:")
    try:
        rows = run_mssql_json_query(
            "SELECT TOP 1 Requirement_Id, Requirement_Title, Requirement_Text, Supplemental_Info FROM NEW_REQUIREMENT;"
        )
        print(json.dumps(rows, indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
