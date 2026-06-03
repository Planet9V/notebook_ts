import asyncio
import re
from scratch.cset_db_pure_sync import run_mssql_json_query, sanitize_id

def main():
    print("Fetching maturity questions...")
    sql_maturity_query = (
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
        "LEFT JOIN MATURITY_LEVELS l ON q.Maturity_Level_Id = l.Maturity_Level_Id;"
    )
    raw_maturity_questions = run_mssql_json_query(sql_maturity_query)
    print(f"Total maturity questions fetched: {len(raw_maturity_questions)}")
    
    found_1021 = [q for q in raw_maturity_questions if int(q.get("Mat_Question_Id")) == 1021]
    print(f"Found 1021 in raw fetch: {found_1021}")
    
    # Let's count how many questions are in CRE+ MIL model in the raw fetch
    cre_mil_qs = [q for q in raw_maturity_questions if q.get("Model_Name") == "CRE+ MIL"]
    print(f"Total CRE+ MIL questions in raw fetch: {len(cre_mil_qs)}")

if __name__ == "__main__":
    main()
