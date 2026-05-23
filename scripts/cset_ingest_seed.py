import os
import re
import asyncio
import sys
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in path so we can import open_notebook
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    sql_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "cset_seeds", "cset_questions.sql")
    if not os.path.exists(sql_path):
        print(f"Error: {sql_path} does not exist!")
        return

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Parse regulations
    reg_pattern = re.compile(
        r"INSERT INTO `regulation` \(id, name, description\) VALUES \('([^']*)', '([^']*)', '([^']*)'\);"
    )
    regulations = []
    for match in reg_pattern.finditer(sql_content):
        reg_id, name, description = match.groups()
        regulations.append({
            "id": f"regulation:{reg_id}",
            "name": name,
            "description": description
        })

    # Parse questions
    q_pattern = re.compile(
        r"INSERT INTO `question` \(id, regulation_id, standard_code, question_text, purdue_level, category\) VALUES \('([^']*)', '([^']*)', '([^']*)', '([^']*)', (\d+), '([^']*)'\);"
    )
    questions = []
    for match in q_pattern.finditer(sql_content):
        q_id, reg_id, std_code, text, level, category = match.groups()
        questions.append({
            "id": f"question:{q_id}",
            "regulation_id": f"regulation:{reg_id}",
            "standard_code": std_code,
            "question_text": text,
            "purdue_level": int(level),
            "category": category
        })

    print(f"Parsed {len(regulations)} regulations and {len(questions)} questions.")

    if regulations:
        print("Inserting/Upserting regulations into SurrealDB...")
        try:
            for reg in regulations:
                q = f"UPSERT {reg['id']} CONTENT $data;"
                data = {k: v for k, v in reg.items() if k != "id"}
                await repo_query(q, {"data": data})
            print("Regulations seeded successfully.")
        except Exception as e:
            print(f"Error seeding regulations: {e}")

    if questions:
        print("Inserting/Upserting questions into SurrealDB...")
        try:
            for q in questions:
                query_str = f"UPSERT {q['id']} CONTENT $data;"
                data = {k: v for k, v in q.items() if k != "id"}
                await repo_query(query_str, {"data": data})
            print("Questions seeded successfully.")
        except Exception as e:
            print(f"Error seeding questions: {e}")

if __name__ == "__main__":
    asyncio.run(main())
