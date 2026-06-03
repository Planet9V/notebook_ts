import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    res = run_mssql_json_query("SELECT Maturity_Model_Id, Model_Name, Model_Title FROM MATURITY_MODELS;")
    print("Maturity Models:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
