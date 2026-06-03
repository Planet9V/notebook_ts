import json
from scratch.cset_db_pure_sync import run_mssql_json_query, sanitize_id

def main():
    sql = (
        "SELECT "
        "  q.Mat_Question_Id, "
        "  q.Question_Title, "
        "  q.Question_Text, "
        "  q.Supplemental_Info, "
        "  q.Category, "
        "  q.Sub_Category, "
        "  m.Model_Name, "
        "  l.Level_Name, "
        "  q.Recommend_Action, "
        "  q.Risk_Addressed "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "LEFT JOIN MATURITY_LEVELS l ON q.Maturity_Level_Id = l.Maturity_Level_Id "
        "WHERE q.Mat_Question_Id = 1021;"
    )
    rows = run_mssql_json_query(sql)
    print("Query returned:")
    print(json.dumps(rows, indent=2))
    
    if rows:
        mq = rows[0]
        model_name = mq.get("Model_Name")
        mat_question_id = mq.get("Mat_Question_Id")
        question_title = mq.get("Question_Title")
        question_text = mq.get("Question_Text")
        
        sanitized_model = sanitize_id(model_name)
        q_id = f"question:{sanitized_model}_mat_{mat_question_id}"
        print("Generated q_id:", q_id)
        
        # Let's see if we do any try/except during insertion or if we had a key/id sanitization issue
        print("Sanitized model name:", sanitized_model)

if __name__ == "__main__":
    main()
