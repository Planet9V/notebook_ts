import os
import re

cset_dir = "/Users/jimmcknney/cset_clone"

def parse_sql_file(path, sets, requirements, req_sets, questions, q_sets):
    try:
        with open(path, "r", encoding="utf-16le") as fh:
            lines = fh.readlines()
    except Exception:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                lines = fh.readlines()
        except Exception:
            return
            
    for line in lines:
        # 1. SETS
        if "INSERT INTO [dbo].[SETS]" in line or "INSERT INTO SETS" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    vals = [v.strip("' ") for v in vals_part[1:-1].split(",")]
                    if len(vals) >= 2:
                        set_name = vals[0]
                        full_name = vals[1]
                        sets[set_name] = full_name
                        
        # 2. REQUIREMENT_SETS
        elif "INSERT INTO [dbo].[REQUIREMENT_SETS]" in line or "INSERT INTO REQUIREMENT_SETS" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    vals = [v.strip("' ") for v in vals_part[1:-1].split(",")]
                    if len(vals) >= 2:
                        req_id = vals[0]
                        set_name = vals[1]
                        if set_name not in req_sets:
                            req_sets[set_name] = []
                        req_sets[set_name].append(req_id)
                        
        # 3. NEW_REQUIREMENT
        elif "INSERT INTO [dbo].[NEW_REQUIREMENT]" in line or "INSERT INTO NEW_REQUIREMENT" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    # Robust split respecting quotes
                    vals = []
                    curr = []
                    in_quotes = False
                    escaped = False
                    for char in vals_part[1:]:
                        if escaped:
                            curr.append(char)
                            escaped = False
                        elif char == "'":
                            in_quotes = not in_quotes
                            curr.append(char)
                        elif char == "," and not in_quotes:
                            vals.append("".join(curr).strip())
                            curr = []
                        elif char == ")" and not in_quotes:
                            vals.append("".join(curr).strip())
                            break
                        else:
                            curr.append(char)
                            
                    if len(vals) >= 3:
                        req_id = vals[0].strip("' ")
                        title = vals[1].strip("' ")
                        text = vals[2].strip("' ")
                        category = vals[3].strip("' ") if len(vals) > 3 else ""
                        subcat = vals[4].strip("' ") if len(vals) > 4 else ""
                        requirements[req_id] = {
                            "id": req_id,
                            "title": title,
                            "text": text,
                            "category": category,
                            "subcat": subcat
                        }
                        
        # 4. NEW_QUESTION_SETS
        elif "INSERT INTO [dbo].[NEW_QUESTION_SETS]" in line or "INSERT INTO NEW_QUESTION_SETS" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    vals = [v.strip("' ") for v in vals_part[1:-1].split(",")]
                    if len(vals) >= 3:
                        set_name = vals[1]
                        q_id = vals[2]
                        if set_name not in q_sets:
                            q_sets[set_name] = []
                        q_sets[set_name].append(q_id)
                        
        # 5. NEW_QUESTION
        elif "INSERT INTO [dbo].[NEW_QUESTION]" in line or "INSERT INTO NEW_QUESTION" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    vals = []
                    curr = []
                    in_quotes = False
                    escaped = False
                    for char in vals_part[1:]:
                        if escaped:
                            curr.append(char)
                            escaped = False
                        elif char == "'":
                            in_quotes = not in_quotes
                            curr.append(char)
                        elif char == "," and not in_quotes:
                            vals.append("".join(curr).strip())
                            curr = []
                        elif char == ")" and not in_quotes:
                            vals.append("".join(curr).strip())
                            break
                        else:
                            curr.append(char)
                            
                    if len(vals) >= 4:
                        q_id = vals[0].strip("' ")
                        std_code = vals[1].strip("' ")
                        text = vals[3].strip("' ")
                        questions[q_id] = {
                            "id": q_id,
                            "std_code": std_code,
                            "text": text
                        }

def main():
    print("Initiating global CSET schema parse...")
    sets = {}
    requirements = {}
    req_sets = {}
    questions = {}
    q_sets = {}
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            parse_sql_file(path, sets, requirements, req_sets, questions, q_sets)
            
    print(f"\nParse complete!")
    print(f"Total Standards (SETS) found: {len(sets)}")
    print(f"Total Requirements (NEW_REQUIREMENT) found: {len(requirements)}")
    print(f"Total Questions (NEW_QUESTION) found: {len(questions)}")
    
    print("\nSummary of framework contents:")
    for set_name, full_name in sorted(sets.items()):
        req_count = len(req_sets.get(set_name, []))
        q_count = len(q_sets.get(set_name, []))
        print(f"  - {set_name} ({full_name[:50]}...): {req_count} requirements, {q_count} questions")

if __name__ == "__main__":
    main()
