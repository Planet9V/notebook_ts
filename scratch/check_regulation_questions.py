import asyncio
import dotenv
import os
import sys

dotenv.load_dotenv()

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def diagnose_all_frameworks():
    print("Fetching all regulations from SurrealDB...")
    regulations = await repo_query("SELECT id, name, fullName, questionCount FROM regulation ORDER BY name ASC")
    print(f"Found {len(regulations)} regulations in database.\n")
    
    print(f"{'ID':<30} | {'Name':<50} | {'DB Reg Count':<12} | {'Actual Qs Count':<15}")
    print("-" * 115)
    
    total_db_questions = 0
    empty_frameworks = []
    
    for reg in regulations:
        reg_id = reg["id"]
        reg_name = reg["name"]
        reg_full_name = reg.get("fullName") or reg.get("full_name") or reg_name
        expected_count = reg.get("questionCount") or 0
        
        # Query the actual number of questions associated with this regulation_id
        q_res = await repo_query(
            "SELECT count() FROM question WHERE regulation_id = $reg_id GROUP ALL",
            {"reg_id": reg_id}
        )
        actual_count = q_res[0]["count"] if q_res else 0
        total_db_questions += actual_count
        
        # Output info
        display_name = reg_name[:50]
        print(f"{reg_id:<30} | {display_name:<50} | {expected_count:<12} | {actual_count:<15}")
        
        if actual_count == 0:
            empty_frameworks.append(reg_id)
            
    print("-" * 115)
    print(f"Total active questions across all frameworks: {total_db_questions}")
    print(f"Frameworks with 0 questions: {len(empty_frameworks)}")
    if empty_frameworks:
        print(f"Empty frameworks: {empty_frameworks}")

if __name__ == "__main__":
    asyncio.run(diagnose_all_frameworks())
