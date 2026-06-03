import asyncio
import os
import re
import sys
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in path so we can import open_notebook
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

BLUEPRINTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "blueprints")

def sanitize_id(raw_id):
    # Convert non-alphanumeric chars to underscores to prevent SurrealDB ID parsing issues
    return re.sub(r"[^a-zA-Z0-9_]", "_", raw_id)

def parse_markdown_blueprint(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract Title / Name
    title_match = re.search(r"^#\s*(?:📘\s*Compliance Record of Note:\s*)?([^\n\r]+)", content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else os.path.basename(filepath).replace(".md", "")

    # Extract Framework ID
    fw_id_match = re.search(r"\*\s*\*Framework ID\*\*\s*:\s*`([^`]+)`", content)
    if not fw_id_match:
        fw_id_match = re.search(r"\*\s*Framework ID\s*:\s*`([^`]+)`", content)
    fw_id = fw_id_match.group(1).strip() if fw_id_match else sanitize_id(os.path.basename(filepath).replace(".md", ""))

    # Extract Category
    category_match = re.search(r"\*\s*\*Category\*\*\s*:\s*`?([^`\n\r]+)`?", content)
    if not category_match:
        category_match = re.search(r"\*\s*Category\s*:\s*`?([^`\n\r]+)`?", content)
    category = category_match.group(1).strip() if category_match else "General Compliance"

    # Extract Description
    desc_match = re.search(r"###\s*Description\s*\n+([^\n\r]+)", content)
    description = desc_match.group(1).strip() if desc_match else f"Cyber security evaluation compliance guidelines for {title}."

    regulation = {
        "id": f"regulation:{sanitize_id(fw_id)}",
        "name": title,
        "category": category,
        "description": description
    }

    # Find the Control Matrix table
    # Standard format: | Standard Code | Question Text | Category | Purdue Level | Guidance / Description |
    questions = []
    matrix_index = content.find("## 🛡️ Control Matrix")
    if matrix_index != -1:
        matrix_section = content[matrix_index:]
        lines = matrix_section.split("\n")
        table_started = False
        
        for line in lines:
            line = line.strip()
            if not line:
                if table_started:
                    # Table ended on empty line
                    break
                continue
            
            if line.startswith("|"):
                # Skip headers and dividers
                if "Standard Code" in line or "---" in line or ":---" in line:
                    table_started = True
                    continue
                
                if table_started:
                    # Parse row
                    parts = [p.strip() for p in line.split("|")]
                    # parts will be ['', 'Standard Code', 'Question Text', 'Category', 'Purdue Level', 'Guidance/Description', '']
                    if len(parts) >= 6:
                        std_code = parts[1].replace("**", "").replace("*", "").strip()
                        q_text = parts[2].strip()
                        q_cat = parts[3].strip()
                        purdue_str = parts[4].strip()
                        q_desc = parts[5].strip()
                        
                        if not std_code or std_code == "":
                            continue
                            
                        try:
                            purdue_level = int(purdue_str)
                        except ValueError:
                            purdue_level = 0
                            
                        # Format question record
                        q_id = f"question:{sanitize_id(fw_id)}_{sanitize_id(std_code)}"
                        questions.append({
                            "id": q_id,
                            "regulation_id": regulation["id"],
                            "standard_code": std_code,
                            "question_text": q_text,
                            "purdue_level": purdue_level,
                            "category": q_cat,
                            "description": q_desc
                        })
                        
    return regulation, questions

async def main():
    print(f"Scanning blueprints directory: {BLUEPRINTS_DIR}")
    if not os.path.exists(BLUEPRINTS_DIR):
        print(f"Error: blueprints directory does not exist at {BLUEPRINTS_DIR}!")
        return

    all_regulations = []
    all_questions = []

    for filename in sorted(os.listdir(BLUEPRINTS_DIR)):
        if filename.endswith(".md"):
            filepath = os.path.join(BLUEPRINTS_DIR, filename)
            try:
                reg, q_list = parse_markdown_blueprint(filepath)
                all_regulations.append(reg)
                all_questions.extend(q_list)
                print(f"Parsed {filename}: {len(q_list)} compliance questions.")
            except Exception as e:
                print(f"Error parsing {filename}: {e}")

    print(f"\nCompleted parsing. Found {len(all_regulations)} regulations and {len(all_questions)} questions.")

    if all_regulations:
        print("\nSeeding regulations into SurrealDB...")
        try:
            for reg in all_regulations:
                q = f"UPSERT {reg['id']} CONTENT $data;"
                data = {k: v for k, v in reg.items() if k != "id"}
                await repo_query(q, {"data": data})
            print("Regulations seeded successfully.")
        except Exception as e:
            print(f"Error seeding regulations: {e}")

    if all_questions:
        print("\nSeeding questions into SurrealDB...")
        try:
            # We seed questions in small batches to prevent database transaction query payload limits
            batch_size = 100
            for i in range(0, len(all_questions), batch_size):
                batch = all_questions[i:i+batch_size]
                for q in batch:
                    query_str = f"UPSERT {q['id']} CONTENT $data;"
                    data = {k: v for k, v in q.items() if k != "id"}
                    await repo_query(query_str, {"data": data})
                print(f"Progress: Seeded questions {i + len(batch)} / {len(all_questions)}...")
            print("All questions seeded successfully.")
        except Exception as e:
            print(f"Error seeding questions: {e}")

    # Print final verification query count
    try:
        reg_count = await repo_query("SELECT count() FROM regulation GROUP ALL;")
        q_count = await repo_query("SELECT count() FROM question GROUP ALL;")
        print("\n--- SurrealDB Verification Counts ---")
        print(f"Regulations table count: {reg_count}")
        print(f"Questions table count: {q_count}")
    except Exception as e:
        print(f"Error running database validation counts: {e}")

if __name__ == "__main__":
    asyncio.run(main())
