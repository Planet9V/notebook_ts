import asyncio
import sys
import os
import re
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from open_notebook.database.repository import repo_query

async def main():
    questions = await repo_query("SELECT id, regulation_id, standard_code, category FROM question;")
    comp_questions = [q for q in questions if str(q.get("regulation_id")) == "regulation:Components"]
    
    components = set()
    for q in comp_questions:
        code = q.get("standard_code", "")
        # Remove trailing numbers
        name = re.sub(r'\s+\d+$', '', code)
        components.add(name)
        
    print(f"Total unique CSET component types: {len(components)}")
    for name in sorted(list(components)):
        print(f"- {name}")

if __name__ == "__main__":
    asyncio.run(main())
