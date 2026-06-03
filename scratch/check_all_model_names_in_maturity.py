import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    sql = (
        "SELECT "
        "  q.Mat_Question_Id, "
        "  m.Model_Name "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "LEFT JOIN MATURITY_LEVELS l ON q.Maturity_Level_Id = l.Maturity_Level_Id;"
    )
    rows = run_mssql_json_query(sql)
    print(f"Total maturity questions: {len(rows)}")
    
    counts = {}
    for r in rows:
        name = r["Model_Name"]
        counts[name] = counts.get(name, 0) + 1
        
    print("Maturity Model Name counts:")
    for name, cnt in sorted(counts.items()):
        print(f"  - '{name}': {cnt}")
        
    # Find any questions where Model_Name starts with CRE+
    cre_qs = [r for r in rows if r["Model_Name"].startswith("CRE+")]
    print(f"\nCRE+ questions count: {len(cre_qs)}")
    cre_counts = {}
    for r in cre_qs:
        name = r["Model_Name"]
        cre_counts[name] = cre_counts.get(name, 0) + 1
    print("CRE+ Model Name counts:")
    print(cre_counts)

if __name__ == "__main__":
    main()
