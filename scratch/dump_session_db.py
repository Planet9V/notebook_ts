import asyncio
import os
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    print("--- CUSTOMERS ---")
    customers = await repo_query("SELECT id, name, sectors, assigned_frameworks FROM customer LIMIT 5")
    for c in customers:
        print(f"Customer: {c['id']} | Name: {c['name']} | Sectors: {c.get('sectors')} | Frameworks: {c.get('assigned_frameworks')}")

    print("\n--- ASSESSMENTS ---")
    assessments = await repo_query("SELECT id, customer_id, framework_id FROM assessment")
    for a in assessments:
        print(f"Assessment: {a['id']} | Customer: {a['customer_id']} | Framework: {a['framework_id']}")

    print("\n--- ALL REGULATIONS IN DATABASE ---")
    regs = await repo_query("SELECT id, name FROM regulation ORDER BY id ASC")
    for r in regs:
        print(f"ID: {r['id']} | Name: {r['name']}")

    print("\n--- SESSIONS ---")
    sessions = await repo_query("SELECT id, assessment_id, session_name, status, version_lock FROM assessment_session")
    for s in sessions:
        print(f"Session: {s['id']} | Assessment: {s['assessment_id']} | Name: {s['session_name']} | Status: {s['status']} | Lock/Framework: {s.get('version_lock')}")

    print("\n--- QUESTIONS COUNT BY REGULATION ---")
    counts = await repo_query("SELECT count(), regulation_id FROM question GROUP BY regulation_id")
    for cnt in counts:
        print(f"Regulation: {cnt['regulation_id']} | Count: {cnt['count']}")

if __name__ == "__main__":
    asyncio.run(main())
