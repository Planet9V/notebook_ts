import asyncio
import os
import re
import sys
import subprocess
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in path so we can import open_notebook
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

def sanitize_id(raw_id):
    return re.sub(r"[^a-zA-Z0-9_]", "_", raw_id)

def map_sal_level(sal):
    sal = str(sal).upper().strip()
    if sal == "L": return 1
    elif sal == "M": return 2
    elif sal == "H": return 3
    elif sal == "VH": return 4
    else: return 0

def run_mssql_query(query_str):
    cmd = [
        "docker", "exec", "-i", "cset-mssql",
        "/opt/mssql-tools/bin/sqlcmd",
        "-U", "sa", "-P", "Password123",
        "-d", "CSET", "-C", "-W", "-s", "|",
        "-Q", query_str
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    if result.returncode != 0:
        raise Exception(f"SQL Execution failed: {result.stderr}")
    return result.stdout

async def main():
    print("====================================================")
    print("STARTING CSET 100% DATABASE PARITY SYNCHRONIZATION")
    print("====================================================\n")

    # Step 1: Query all existing questions in SurrealDB to build a quick lookup map
    print("Step 1: Downloading existing SurrealDB compliance registry map...")
    existing_map = {}
    try:
        existing_records = await repo_query("SELECT id, description FROM question LIMIT 50000;")
        for rec in existing_records:
            existing_map[str(rec["id"])] = rec.get("description") or ""
        print(f"  Successfully indexed {len(existing_map)} existing questions in memory.")
    except Exception as e:
        print(f"  Warning: could not index existing SurrealDB questions: {e}. Proceeding without preservation merge.")

    # Step 2: Fetch all standards (SETS) from CSET MSSQL Server
    print("\nStep 2: Fetching official standard sets from CSET container...")
    try:
        sets_stdout = run_mssql_query("SET NOCOUNT ON; SELECT Set_Name, Full_Name FROM SETS;")
        raw_sets = []
        for line in sets_stdout.split("\n"):
            line = line.strip()
            if not line or "Set_Name|Full_Name" in line or line.startswith("---") or "rows affected" in line:
                continue
            parts = line.split("|")
            if len(parts) >= 2:
                raw_sets.append({
                    "name": parts[0].strip(),
                    "full_name": parts[1].strip()
                })
        print(f"  Found {len(raw_sets)} standards in CSET.")
    except Exception as e:
        print(f"Error fetching standards from CSET MSSQL container: {e}")
        return

    # Step 3: Ingest frameworks into SurrealDB's regulation table
    print("\nStep 3: Ingesting frameworks into SurrealDB...")
    regulations_to_insert = []
    for s in raw_sets:
        reg_id = f"regulation:{sanitize_id(s['name'])}"
        regulations_to_insert.append({
            "id": reg_id,
            "name": s["full_name"],
            "category": "Energy & Critical Infrastructure" if "INGAA" in s["name"] or "AWWA" in s["name"] or "CIP" in s["name"] else "General Compliance",
            "description": f"Official compliance framework standard set {s['name']} imported from CISA CSET."
        })

    try:
        for reg in regulations_to_insert:
            q = f"UPSERT {reg['id']} CONTENT $data;"
            data = {k: v for k, v in reg.items() if k != "id"}
            await repo_query(q, {"data": data})
        print(f"  Ingested {len(regulations_to_insert)} framework regulations successfully.")
    except Exception as e:
        print(f"Error seeding regulations to SurrealDB: {e}")
        return

    # Step 4: Fetch all 32,844 question-to-set mappings from CSET MSSQL Server
    print("\nStep 4: Fetching all standard question mappings from CSET container...")
    try:
        # Piped query replacing newlines in questions & categories to keep pipe formatting single-line safe
        sql_query = (
            "SET NOCOUNT ON; "
            "SELECT s.Set_Name, q.Question_Id, q.Std_Ref, "
            "REPLACE(REPLACE(q.Simple_Question, CHAR(13), ' '), CHAR(10), ' ') as Simple_Question, "
            "REPLACE(REPLACE(h.Question_Group_Heading, CHAR(13), ' '), CHAR(10), ' ') as Category, "
            "q.Universal_Sal_Level "
            "FROM NEW_QUESTION q "
            "JOIN ("
            "  SELECT Set_Name, Question_Id FROM NEW_QUESTION_SETS "
            "  UNION "
            "  SELECT Set_Name, Question_Id FROM REQUIREMENT_QUESTIONS_SETS"
            ") as s ON q.Question_Id = s.Question_Id "
            "LEFT JOIN QUESTION_GROUP_HEADING h ON q.Question_Group_Id = h.Question_Group_Heading_Id;"
        )
        questions_stdout = run_mssql_query(sql_query)
        raw_questions = []
        for line in questions_stdout.split("\n"):
            line = line.strip()
            if not line or "Set_Name|Question_Id" in line or line.startswith("---") or "rows affected" in line:
                continue
            parts = line.split("|")
            if len(parts) >= 6:
                raw_questions.append({
                    "set_name": parts[0].strip(),
                    "question_id": parts[1].strip(),
                    "std_ref": parts[2].strip(),
                    "simple_question": parts[3].strip(),
                    "category": parts[4].strip(),
                    "sal_level": parts[5].strip()
                })
        print(f"  Found {len(raw_questions)} standard-to-question mappings in CSET.")
    except Exception as e:
        print(f"Error fetching questions from CSET MSSQL container: {e}")
        return

    # Step 5: Merge CSET questions with SurrealDB, preserving rich blueprint descriptions
    print("\nStep 5: Merging questions and preserving blueprint metadata...")
    questions_to_insert = []
    for q in raw_questions:
        sanitized_set = sanitize_id(q["set_name"])
        q_id = f"question:{sanitized_set}_{q['question_id']}"
        
        category = q["category"]
        if not category or category == "NULL" or category == "":
            category = "Control"

        # Check if question has rich blueprint metadata preserved
        existing_desc = existing_map.get(q_id, "")
        if "SOP:" in existing_desc:
            # Preservation match: keep the rich description (containing SOP, risks, etc.)
            description = existing_desc
        else:
            # Standard question description: use empty or simple indicator
            description = f"Regulatory compliance check {q['std_ref']} under CSET standard set {q['set_name']}."

        questions_to_insert.append({
            "id": q_id,
            "regulation_id": f"regulation:{sanitized_set}",
            "standard_code": q["std_ref"],
            "question_text": q["simple_question"],
            "purdue_level": map_sal_level(q["sal_level"]),
            "category": category,
            "description": description
        })

    print(f"  Prepped {len(questions_to_insert)} questions for upsert.")

    # Step 6: Upsert questions in async batches
    print("\nStep 6: Executing batched SurrealDB upserts...")
    batch_size = 200
    try:
        for idx in range(0, len(questions_to_insert), batch_size):
            batch = questions_to_insert[idx : idx + batch_size]
            # Parallelize transaction requests inside the batch
            tasks = []
            for item in batch:
                q_str = f"UPSERT {item['id']} CONTENT $data;"
                data = {k: v for k, v in item.items() if k != "id"}
                tasks.append(repo_query(q_str, {"data": data}))
            await asyncio.gather(*tasks)
            print(f"  Seeded questions {idx + len(batch)} / {len(questions_to_insert)}...")
        print("  All questions successfully populated!")
    except Exception as e:
        print(f"Error seeding questions in batch: {e}")
        return

    # Step 7: Print final database parity stats
    print("\n====================================================")
    print("MIGRATION COMPLETE - FINAL SYSTEM AUDIT COUNTS")
    print("====================================================")
    try:
        reg_count = await repo_query("SELECT count() FROM regulation GROUP ALL;")
        q_count = await repo_query("SELECT count() FROM question GROUP ALL;")
        print(f"  SurrealDB Total Regulations (Frameworks): {reg_count}")
        print(f"  SurrealDB Total Questions (Audits):      {q_count}")
        print("====================================================")
    except Exception as e:
        print(f"Error running final audits: {e}")

if __name__ == "__main__":
    asyncio.run(main())
