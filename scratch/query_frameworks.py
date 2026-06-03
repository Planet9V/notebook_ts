import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    print("=========================================================")
    print("QUERYING SURREALDB FOR VERIFICATION AND PARITY PROOF")
    print("=========================================================\n")

    # 1. Query for INGAA framework
    print("1. QUERYING FOR FRAMEWORK: INGAA (Energy)")
    print("---------------------------------------------------------")
    try:
        reg_ingaa = await repo_query("SELECT * FROM regulation WHERE id = 'regulation:INGAA';")
        if reg_ingaa:
            r = reg_ingaa[0]
            print(f"ID:          {r['id']}")
            print(f"Name:        {r['name']}")
            print(f"Category:    {r['category']}")
            print(f"Sector:      {r['sector']}")
            print(f"Q Count:     {r['questionCount']}")
            print(f"Description: {r['description']}")
        else:
            print("INGAA Regulation framework not found!")
            
        print("\nFETCHING TOP 3 DETAILED COMPLIANCE QUESTIONS FOR INGAA:")
        questions_ingaa = await repo_query(
            "SELECT id, standard_code, question_text, description, purdue_level, category "
            "FROM question WHERE type::string(regulation_id) = 'regulation:INGAA' "
            "LIMIT 3;"
        )
        for idx, q in enumerate(questions_ingaa):
            print(f"\n--- [INGAA Question {idx+1}] ID: {q['id']} ---")
            print(f"Standard Code:   {q['standard_code']}")
            print(f"Question Text:   {q['question_text']}")
            print(f"Purdue Zone:     Level {q['purdue_level']}")
            print(f"Category:        {q['category']}")
            print("Detailed Native Markdown Description (Fully Hydrated):")
            print("---------------------------------------------------------")
            print(q['description'])
            print("---------------------------------------------------------")
    except Exception as e:
        print("Error querying INGAA:", e)

    # 2. Query for NIST SP 800-53 (most recent version)
    print("\n\n2. QUERYING FOR FRAMEWORK: NIST Special Publication 800-53 (Revision 5)")
    print("---------------------------------------------------------")
    try:
        # Let's list all 800-53 revisions in our SurrealDB database
        revisions = await repo_query(
            "SELECT id, name, questionCount FROM regulation WHERE type::string(id) CONTAINS 'C800_53' OR type::string(id) CONTAINS 'NIST800';"
        )
        print("Found the following NIST 800-53 framework sets in SurrealDB:")
        for rev in revisions:
            print(f"  - ID: '{rev['id']}' | Name: '{rev['name']}' | Questions: {rev['questionCount']}")
            
        target_rev5 = "regulation:C800_53_R5_V2"
        print(f"\nFETCHING SAMPLE COMPLIANCE QUESTIONS FOR REVISION 5 (ID: '{target_rev5}'):")
        questions_r5 = await repo_query(
            "SELECT id, standard_code, question_text, description, purdue_level, category "
            "FROM question WHERE type::string(regulation_id) = $id "
            "LIMIT 2;",
            {"id": target_rev5}
        )
        for idx, q in enumerate(questions_r5):
            print(f"\n--- [NIST 800-53 R5 Question {idx+1}] ID: {q['id']} ---")
            print(f"Standard Code:   {q['standard_code']}")
            print(f"Question Text:   {q['question_text']}")
            print(f"Purdue Zone:     Level {q['purdue_level']}")
            print(f"Category:        {q['category']}")
            print("Detailed Native Markdown Description (Fully Hydrated):")
            print("---------------------------------------------------------")
            print(q['description'])
            print("---------------------------------------------------------")
    except Exception as e:
        print("Error querying NIST 800-53:", e)

if __name__ == "__main__":
    asyncio.run(main())
