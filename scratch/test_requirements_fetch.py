import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    print("Testing requirements fetch query...")
    try:
        sql = (
            "SELECT TOP 5 "
            "  rs.Set_Name, "
            "  r.Requirement_Id, "
            "  r.Requirement_Title, "
            "  r.Requirement_Text, "
            "  r.Supplemental_Info, "
            "  h.Question_Group_Heading as Category, "
            "  (SELECT TOP 1 Standard_Level FROM REQUIREMENT_LEVELS WHERE Requirement_Id = r.Requirement_Id) as Sal_Level "
            "FROM REQUIREMENT_SETS rs "
            "JOIN NEW_REQUIREMENT r ON rs.Requirement_Id = r.Requirement_Id "
            "LEFT JOIN QUESTION_GROUP_HEADING h ON r.Question_Group_Heading_Id = h.Question_Group_Heading_Id;"
        )
        rows = run_mssql_json_query(sql)
        print("Successfully fetched sample rows:")
        print(json.dumps(rows, indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
