import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    print("Checking set names in the SETS table...")
    # List a few set names and see if we can query tables
    try:
        tables = run_mssql_json_query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';"
        )
        print("Tables in CSET DB:")
        for t in sorted([item["TABLE_NAME"] for item in tables]):
            print(f"  - {t}")
    except Exception as e:
        print("Error listing tables:", e)

if __name__ == "__main__":
    main()
