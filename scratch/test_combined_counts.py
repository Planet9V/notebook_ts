import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    sql = (
        "SELECT "
        "  s.Set_Name, "
        "  (SELECT COUNT(DISTINCT Question_Id) FROM ("
        "     SELECT Set_Name, Question_Id FROM NEW_QUESTION_SETS"
        "     UNION"
        "     SELECT Set_Name, Question_Id FROM REQUIREMENT_QUESTIONS_SETS"
        "   ) as q WHERE q.Set_Name = s.Set_Name) as QCount, "
        "  (SELECT COUNT(DISTINCT Requirement_Id) FROM REQUIREMENT_SETS WHERE Set_Name = s.Set_Name) as RCount "
        "FROM SETS s "
        "ORDER BY s.Set_Name;"
    )
    rows = run_mssql_json_query(sql)
    print("Combined CSET counts per set:")
    for r in rows:
        qc = r["QCount"]
        rc = r["RCount"]
        total = qc + rc
        if total > 0:
            print(f"  - {r['Set_Name']}: Questions={qc}, Requirements={rc}, Total={total}")
        else:
            print(f"  - {r['Set_Name']}: Empty (0)")

if __name__ == "__main__":
    main()
