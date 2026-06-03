import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    print("Checking model 24 (CRE+ MIL) details:")
    
    # Query model details
    try:
        model = run_mssql_json_query(
            "SELECT * FROM MATURITY_MODELS WHERE Model_Name = 'CRE+ MIL';"
        )
        print("Model:")
        print(json.dumps(model, indent=2))
        model_id = model[0]["Maturity_Model_Id"] if model else None
    except Exception as e:
        print("Error:", e)
        model_id = None
        
    if model_id:
        # Check levels for this model
        try:
            levels = run_mssql_json_query(
                f"SELECT * FROM MATURITY_LEVELS WHERE Maturity_Model_Id = {model_id};"
            )
            print("Levels for this model:")
            print(json.dumps(levels, indent=2))
        except Exception as e:
            print("Error checking levels:", e)
            
        # Check count of questions for this model
        try:
            q_cnt = run_mssql_json_query(
                f"SELECT COUNT(*) as cnt FROM MATURITY_QUESTIONS WHERE Maturity_Model_Id = {model_id};"
            )
            print("Questions count in MATURITY_QUESTIONS:", q_cnt[0]["cnt"] if q_cnt else 0)
        except Exception as e:
            print("Error checking questions count:", e)

        # Check question 1021 details
        try:
            q1021 = run_mssql_json_query(
                f"SELECT Mat_Question_Id, Maturity_Level_Id, Question_Title FROM MATURITY_QUESTIONS WHERE Mat_Question_Id = 1021;"
            )
            print("Question 1021:")
            print(json.dumps(q1021, indent=2))
        except Exception as e:
            print("Error checking question 1021:", e)
            
        # Check if Maturity_Level_Id matches anything in MATURITY_LEVELS
        if q1021:
            lvl_id = q1021[0]["Maturity_Level_Id"]
            try:
                lvl = run_mssql_json_query(
                    f"SELECT * FROM MATURITY_LEVELS WHERE Maturity_Level_Id = {lvl_id};"
                )
                print("Maturity Level records for level_id:", json.dumps(lvl, indent=2))
            except Exception as e:
                print("Error checking maturity levels for id:", e)

if __name__ == "__main__":
    main()
