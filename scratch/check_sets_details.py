import json
from scratch.cset_db_pure_sync import run_mssql_json_query

def main():
    empty_sets = [
        "AWWA 4.0",
        "C800_53_R3_App_I_old",
        "C800_53_R3_old",
        "Cag",
        "Cnssi_Ics_V1",
        "Dod",
        "Florida_NCSF_V1",
        "Florida_NCSF_V2",
        "HHS405d",
        "HHS405dAAA",
        "MOPhysical",
        "NCSF_V2_Index",
        "RA-renames",
        "SET.20251027.123248",
        "SET.20251120.154359",
        "SET.20251204.161611",
        "SET.20260106.105039",
        "SP800-82 V3"
    ]
    
    print("Checking counts in CSET tables for target 'empty' sets:")
    
    for s in empty_sets:
        print(f"\n--- SET: {s} ---")
        
        # 1. NEW_QUESTION_SETS
        try:
            nq_count = run_mssql_json_query(
                f"SELECT COUNT(*) as cnt FROM NEW_QUESTION_SETS WHERE Set_Name = '{s}';"
            )
            nq_cnt = nq_count[0]["cnt"] if nq_count else 0
        except Exception as e:
            nq_cnt = f"error: {e}"
            
        # 2. REQUIREMENT_QUESTIONS_SETS
        try:
            rqs_count = run_mssql_json_query(
                f"SELECT COUNT(*) as cnt FROM REQUIREMENT_QUESTIONS_SETS WHERE Set_Name = '{s}';"
            )
            rqs_cnt = rqs_count[0]["cnt"] if rqs_count else 0
        except Exception as e:
            rqs_cnt = f"error: {e}"
            
        # 3. REQUIREMENT_SETS
        try:
            rs_count = run_mssql_json_query(
                f"SELECT COUNT(*) as cnt FROM REQUIREMENT_SETS WHERE Set_Name = '{s}';"
            )
            rs_cnt = rs_count[0]["cnt"] if rs_count else 0
        except Exception as e:
            rs_cnt = f"error: {e}"
            
        print(f"  NEW_QUESTION_SETS:        {nq_cnt}")
        print(f"  REQUIREMENT_QUESTIONS_SETS: {rqs_cnt}")
        print(f"  REQUIREMENT_SETS:          {rs_cnt}")

if __name__ == "__main__":
    main()
