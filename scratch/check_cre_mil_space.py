import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    q = (
        "SELECT DISTINCT q.Maturity_Model_Id, m.Model_Name "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "WHERE q.Maturity_Model_Id = 24;"
    )
    res = run_mssql_json_query(q)
    print("Joined query distinct Model_Name for model 24:")
    print(res)

if __name__ == "__main__":
    main()
