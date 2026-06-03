import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    sql = (
        "SELECT "
        "  s.Set_Name, "
        "  q.Question_Id, "
        "  q.Std_Ref, "
        "  r.Requirement_Id, "
        "  r.Requirement_Title "
        "FROM NEW_QUESTION q "
        "JOIN ("
        "  SELECT Set_Name, Question_Id FROM NEW_QUESTION_SETS "
        "  UNION "
        "  SELECT Set_Name, Question_Id FROM REQUIREMENT_QUESTIONS_SETS"
        ") as s ON q.Question_Id = s.Question_Id "
        "LEFT JOIN REQUIREMENT_QUESTIONS_SETS rq ON q.Question_Id = rq.Question_Id AND s.Set_Name = rq.Set_Name "
        "LEFT JOIN NEW_REQUIREMENT r ON rq.Requirement_Id = r.Requirement_Id "
        "WHERE s.Set_Name = 'WMATA YR3';"
    )
    rows = run_mssql_json_query(sql)
    print(f"Total rows fetched for WMATA YR3: {len(rows)}")
    
    seen_qids = {}
    for r in rows:
        qid = r["Question_Id"]
        seen_qids[qid] = seen_qids.get(qid, []) + [r]
        
    duplicates = {qid: list_rows for qid, list_rows in seen_qids.items() if len(list_rows) > 1}
    print(f"Total unique Question_Ids: {len(seen_qids)}")
    print(f"Duplicate Question_Ids: {len(duplicates)}")
    for qid, list_rows in duplicates.items():
        print(f"\nDuplicate QID: {qid}")
        for idx, row in enumerate(list_rows):
            print(f"  Row {idx+1}: Std_Ref = {row.get('Std_Ref')}, Req_Id = {row.get('Requirement_Id')}, Req_Title = {row.get('Requirement_Title')}")

if __name__ == "__main__":
    main()
