import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    sql = (
        "SELECT "
        "  s.Set_Name, "
        "  q.Question_Id, "
        "  q.Std_Ref, "
        "  q.Simple_Question, "
        "  h.Question_Group_Heading as Category, "
        "  r.Requirement_Id, "
        "  r.Requirement_Title "
        "FROM NEW_QUESTION q "
        "JOIN ("
        "  SELECT Set_Name, Question_Id FROM NEW_QUESTION_SETS "
        "  UNION "
        "  SELECT Set_Name, Question_Id FROM REQUIREMENT_QUESTIONS_SETS"
        ") as s ON q.Question_Id = s.Question_Id "
        "LEFT JOIN QUESTION_GROUP_HEADING h ON q.Question_Group_Id = h.Question_Group_Heading_Id "
        "LEFT JOIN REQUIREMENT_QUESTIONS_SETS rq ON q.Question_Id = rq.Question_Id AND s.Set_Name = rq.Set_Name "
        "LEFT JOIN NEW_REQUIREMENT r ON rq.Requirement_Id = r.Requirement_Id "
        "WHERE s.Set_Name = 'WMATA YR3' AND q.Question_Id = 1905;"
    )
    rows = run_mssql_json_query(sql)
    print("Question 1905 rows:")
    print(json.dumps(rows, indent=2))

if __name__ == "__main__":
    main()
