import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    q = (
        "SELECT q.Mat_Question_Id, q.Question_Title, m.Model_Name "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "WHERE q.Maturity_Model_Id = 24;"
    )
    res = run_mssql_json_query(q)
    print(f"Total questions for model 24: {len(res)}")
    names = {}
    for item in res:
        name = item["Model_Name"]
        names[name] = names.get(name, 0) + 1
    print("Model name distributions:")
    print(names)

if __name__ == "__main__":
    main()
