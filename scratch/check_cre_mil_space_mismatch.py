import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    sql = (
        "SELECT "
        "  q.Mat_Question_Id, "
        "  m.Model_Name "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "LEFT JOIN MATURITY_LEVELS l ON q.Maturity_Level_Id = l.Maturity_Level_Id "
        "WHERE q.Maturity_Model_Id = 24;"
    )
    rows = run_mssql_json_query(sql)
    print(f"Total rows: {len(rows)}")
    unique_names = set(r["Model_Name"] for r in rows)
    print("Unique Model_Names returned by joined query for model 24:")
    print(unique_names)
    
    # Check if any row has a different name
    for r in rows:
        if r["Model_Name"] != "CRE+ MIL":
            print(f"Mismatch: Mat_Question_Id = {r['Mat_Question_Id']}, Model_Name = '{r['Model_Name']}'")

if __name__ == "__main__":
    main()
