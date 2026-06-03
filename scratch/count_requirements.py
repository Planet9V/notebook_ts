import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    print("Fetching total counts per Set_Name in REQUIREMENT_SETS:")
    try:
        counts = run_mssql_json_query(
            "SELECT Set_Name, COUNT(*) as cnt FROM REQUIREMENT_SETS GROUP BY Set_Name ORDER BY Set_Name;"
        )
        print(f"Total standard sets in REQUIREMENT_SETS: {len(counts)}")
        total_reqs = 0
        for c in counts:
            print(f"  - {c['Set_Name']}: {c['cnt']}")
            total_reqs += c['cnt']
        print(f"Total requirements mapped: {total_reqs}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
