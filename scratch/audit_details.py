import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from open_notebook.database.repository import repo_query

async def main():
    print("====================================================")
    # 1. Total questions count
    q_count = await repo_query("SELECT count() FROM question GROUP ALL;")
    total_q = q_count[0]["count"] if q_count else 0
    
    # 2. Count questions with markdown descriptions
    desc_count = await repo_query("SELECT count() FROM question WHERE description != '' GROUP ALL;")
    total_desc = desc_count[0]["count"] if desc_count else 0
    
    # 3. Count questions containing requirement titles (indicated by '# ' in markdown)
    title_count = await repo_query("SELECT count() FROM question WHERE description CONTAINS '#' GROUP ALL;")
    total_title = title_count[0]["count"] if title_count else 0

    # 4. Count questions containing detailed requirements section ('### Detailed Regulatory Requirement' or '### Requirement Statement')
    req_text_count = await repo_query(
        "SELECT count() FROM question WHERE description CONTAINS '### Detailed Regulatory Requirement' OR description CONTAINS '### Requirement Statement' GROUP ALL;"
    )
    total_req_text = req_text_count[0]["count"] if req_text_count else 0

    # 5. Count questions containing supplemental info ('### Supplemental Explanation & Guidance')
    supp_count = await repo_query("SELECT count() FROM question WHERE description CONTAINS '### Supplemental Explanation & Guidance' GROUP ALL;")
    total_supp = supp_count[0]["count"] if supp_count else 0

    # 6. Count questions containing citations ('### Citations & Source Documentation')
    cit_count = await repo_query("SELECT count() FROM question WHERE description CONTAINS '### Citations & Source Documentation' GROUP ALL;")
    total_cit = cit_count[0]["count"] if cit_count else 0

    # 7. Count questions with Purdue Level mapped (between 1 and 4)
    purdue_count = await repo_query("SELECT count() FROM question WHERE purdue_level >= 1 AND purdue_level <= 4 GROUP ALL;")
    total_purdue = purdue_count[0]["count"] if purdue_count else 0

    print("SURREALDB NATIVE DATASET METRICS:")
    metrics = {
        "Total Ingested Mappings": total_q,
        "With Active Markdown Description": total_desc,
        "With Enriched Markdown Headers & Titles": total_title,
        "With Regulatory/Requirement Text": total_req_text,
        "With Supplemental Explanation & Guidance": total_supp,
        "With Hydrated Citations": total_cit,
        "With Mapped Purdue Level (1-4)": total_purdue
    }
    for k, v in metrics.items():
        print(f"  - {k}: {v}")

    # Fetch actual sample question from each of the three pipelines
    print("\nFETCHING REAL SAMPLES FOR EACH INGESTION PIPELINE:")
    
    # 1. Standard Question
    std_q = await repo_query(
        "SELECT id, regulation_id, standard_code, question_text, description "
        "FROM question WHERE type::string(id) CONTAINS 'INGAA' AND (type::string(id) CONTAINS 'req' == false) "
        "LIMIT 1;"
    )
    if std_q:
        print("\n--- SAMPLE 1: STANDARD QUESTION ---")
        print(f"ID: {std_q[0]['id']}")
        print(f"Regulation: {std_q[0]['regulation_id']}")
        print(f"Standard Code: {std_q[0]['standard_code']}")
        print(f"Question Text: {std_q[0]['question_text']}")
        print("Description Preview:")
        print(std_q[0]['description'])
    else:
        print("No standard questions found.")
        
    # 2. Standard Requirement (Ingested from REQUIREMENT_SETS)
    std_req = await repo_query(
        "SELECT id, regulation_id, standard_code, question_text, description "
        "FROM question WHERE type::string(id) CONTAINS 'req' AND (type::string(id) CONTAINS 'mat' == false) "
        "LIMIT 1;"
    )
    if std_req:
        print("\n--- SAMPLE 2: STANDARD REGULATORY REQUIREMENT ---")
        print(f"ID: {std_req[0]['id']}")
        print(f"Regulation: {std_req[0]['regulation_id']}")
        print(f"Standard Code: {std_req[0]['standard_code']}")
        print(f"Question Text: {std_req[0]['question_text']}")
        print("Description Preview:")
        print(std_req[0]['description'])
    else:
        print("No standard requirements found.")

    # 3. Maturity Question (Ingested from MATURITY_QUESTIONS)
    mat_q = await repo_query(
        "SELECT id, regulation_id, standard_code, question_text, description "
        "FROM question WHERE type::string(id) CONTAINS 'mat' "
        "LIMIT 1;"
    )
    if mat_q:
        print("\n--- SAMPLE 3: MATURITY PRACTICE/QUESTION ---")
        print(f"ID: {mat_q[0]['id']}")
        print(f"Regulation: {mat_q[0]['regulation_id']}")
        print(f"Standard Code: {mat_q[0]['standard_code']}")
        print(f"Question Text: {mat_q[0]['question_text']}")
        print("Description Preview:")
        print(mat_q[0]['description'])
    else:
        print("No maturity questions found.")

if __name__ == "__main__":
    asyncio.run(main())
