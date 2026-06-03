import dotenv
import asyncio
import os
import sys

dotenv.load_dotenv()
sys.path.append(os.getcwd())

from open_notebook.database.repository import repo_query

async def main():
    print("====================================================")
    print("QUERYING REGULATION METADATA FOR INGAA & NIST 800-53")
    print("====================================================\n")
    
    reg_ingaa = await repo_query("SELECT * FROM regulation:INGAA_GUIDE")
    reg_nist = await repo_query("SELECT * FROM regulation:NIST_800_53")
    
    print("INGAA REGULATION METADATA:")
    if reg_ingaa:
        print(f"  ID: {reg_ingaa[0]['id']}")
        print(f"  Name: {reg_ingaa[0]['name']}")
        print(f"  Category: {reg_ingaa[0]['category']}")
        print(f"  Description: {reg_ingaa[0]['description']}")
    else:
        print("  INGAA Regulation not found!")
        
    print("\nNIST 800-53 REGULATION METADATA:")
    if reg_nist:
        print(f"  ID: {reg_nist[0]['id']}")
        print(f"  Name: {reg_nist[0]['name']}")
        print(f"  Category: {reg_nist[0]['category']}")
        print(f"  Description: {reg_nist[0]['description']}")
    else:
        print("  NIST 800-53 Regulation not found!")
        
    print("\n----------------------------------------------------\n")
    
    ingaa_count = await repo_query("SELECT count() FROM question WHERE regulation_id = 'regulation:INGAA_GUIDE' GROUP ALL")
    nist_count = await repo_query("SELECT count() FROM question WHERE regulation_id = 'regulation:NIST_800_53' GROUP ALL")
    
    print(f"Total questions in database for INGAA: {ingaa_count}")
    print(f"Total questions in database for NIST 800-53: {nist_count}")
    print("\n----------------------------------------------------\n")
    
    print("FETCHING FULL DETAILS OF SAMPLE QUESTIONS FOR INGAA:")
    ingaa_qs = await repo_query("SELECT * FROM question WHERE regulation_id = 'regulation:INGAA_GUIDE' LIMIT 2")
    for idx, q in enumerate(ingaa_qs):
        print(f"\n[INGAA Question {idx+1}]")
        print(f"  ID: {q['id']}")
        print(f"  Standard Code: {q.get('standard_code')}")
        print(f"  Category: {q.get('category')}")
        print(f"  Purdue Level: {q.get('purdue_level')}")
        print(f"  Question Text: {q.get('question_text')}")
        print(f"  Guidance/Description (FULL LONG TEXT):")
        print(f"    {q.get('description')}")
        
    print("\n----------------------------------------------------\n")
    print("FETCHING FULL DETAILS OF SAMPLE QUESTIONS FOR NIST 800-53:")
    nist_qs = await repo_query("SELECT * FROM question WHERE regulation_id = 'regulation:NIST_800_53' LIMIT 2")
    for idx, q in enumerate(nist_qs):
        print(f"\n[NIST 800-53 Question {idx+1}]")
        print(f"  ID: {q['id']}")
        print(f"  Standard Code: {q.get('standard_code')}")
        print(f"  Category: {q.get('category')}")
        print(f"  Purdue Level: {q.get('purdue_level')}")
        print(f"  Question Text: {q.get('question_text')}")
        print(f"  Guidance/Description (FULL LONG TEXT):")
        print(f"    {q.get('description')}")

if __name__ == "__main__":
    asyncio.run(main())
