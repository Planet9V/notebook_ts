import os
import sys


def parse_sql_values(vals_part):
    vals_part = vals_part.strip()
    if vals_part.startswith("("):
        vals_part = vals_part[1:]
    if vals_part.endswith(")") or vals_part.endswith(");"):
        vals_part = vals_part.rstrip(");")
    
    vals = []
    i = 0
    n = len(vals_part)
    current_val = []
    in_quotes = False
    
    while i < n:
        char = vals_part[i]
        if in_quotes:
            if char == "'":
                if i + 1 < n and vals_part[i+1] == "'":
                    current_val.append("'")
                    i += 2
                    continue
                else:
                    in_quotes = False
                    i += 1
                    continue
            else:
                current_val.append(char)
                i += 1
        else:
            if char == "'" or (char == "N" and i + 1 < n and vals_part[i+1] == "'"):
                in_quotes = True
                if char == "'":
                    i += 1
                else:
                    i += 2
                continue
            elif char == ",":
                vals.append("".join(current_val).strip())
                current_val = []
                i += 1
            else:
                current_val.append(char)
                i += 1
                
    vals.append("".join(current_val).strip())
    
    cleaned_vals = []
    for v in vals:
        v_upper = v.upper()
        if v_upper == "NULL" or v == "":
            cleaned_vals.append(None)
        elif (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
            cleaned_vals.append(v[1:-1])
        else:
            cleaned_vals.append(v)
            
    return cleaned_vals

def extract_insert_columns_and_values(line):
    # Insert statements look like:
    # INSERT INTO [dbo].[TABLE] ([Col1], [Col2]) VALUES (Val1, Val2)
    # or INSERT INTO TABLE (Col1, Col2) VALUES (Val1, Val2)
    line_upper = line.upper()
    if "INSERT INTO" not in line_upper or "VALUES" not in line_upper:
        return None, None
    
    try:
        # Split by VALUES
        parts = line.split("VALUES")
        if len(parts) < 2:
            return None, None
        
        insert_part = parts[0]
        vals_part = "VALUES".join(parts[1:])
        
        # Get Table name
        table_match = [t.strip("[] ") for t in insert_part.split("INTO")[1].split("(")[0].split(".")]
        table_name = table_match[-1]
        
        # Get columns
        cols = []
        if "(" in insert_part:
            cols_part = insert_part.split("(")[1].split(")")[0]
            cols = [c.strip("[] ") for c in cols_part.split(",")]
            
        vals = parse_sql_values(vals_part)
        
        if cols and len(cols) == len(vals):
            return table_name, dict(zip(cols, vals))
        else:
            # If columns were not matched, return values list
            return table_name, vals
    except Exception as e:
        return None, None

def main():
    cset_dir = "/Users/jimmcknney/cset_clone"
    print("Initiating global CSET schema parse...")
    
    sets = {}            # Set_Name -> Full_Name
    requirements = {}    # Req_Id -> dict
    req_sets = {}        # Set_Name -> list of Req_Id
    questions = {}       # Question_Id -> dict
    q_sets = {}          # Set_Name -> list of Question_Id
    
    maturity_models = {} # Model_Id -> Model_Name
    maturity_questions = {} # Question_Id -> dict
    maturity_levels = {} # Level_Id -> Level_Name
    
    sql_files_count = 0
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            sql_files_count += 1
            
            try:
                with open(path, "r", encoding="utf-16le") as fh:
                    lines = fh.readlines()
            except Exception:
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        lines = fh.readlines()
                except Exception:
                    continue
            
            for line in lines:
                if "INSERT INTO" not in line and "insert into" not in line:
                    continue
                
                table_name, parsed = extract_insert_columns_and_values(line)
                if not table_name or not parsed or not isinstance(parsed, dict):
                    continue
                
                # 1. SETS
                if table_name == "SETS":
                    set_name = parsed.get("Set_Name")
                    full_name = parsed.get("Full_Name") or parsed.get("Short_Name")
                    if set_name and full_name:
                        sets[set_name] = full_name
                        
                # 2. REQUIREMENT_SETS
                elif table_name == "REQUIREMENT_SETS":
                    req_id = parsed.get("Requirement_Id")
                    set_name = parsed.get("Set_Name")
                    if req_id and set_name:
                        if set_name not in req_sets:
                            req_sets[set_name] = []
                        req_sets[set_name].append(req_id)
                        
                # 3. NEW_REQUIREMENT
                elif table_name == "NEW_REQUIREMENT":
                    req_id = parsed.get("Requirement_Id")
                    title = parsed.get("Requirement_Title")
                    text = parsed.get("Requirement_Text")
                    category = parsed.get("Category") or "Control"
                    subcat = parsed.get("Sub_Category") or ""
                    if req_id:
                        requirements[req_id] = {
                            "id": req_id,
                            "title": title,
                            "text": text,
                            "category": category,
                            "subcat": subcat
                        }
                        
                # 4. NEW_QUESTION_SETS
                elif table_name == "NEW_QUESTION_SETS":
                    q_id = parsed.get("Question_Id")
                    set_name = parsed.get("Set_Name")
                    if q_id and set_name:
                        if set_name not in q_sets:
                            q_sets[set_name] = []
                        q_sets[set_name].append(q_id)
                        
                # 5. NEW_QUESTION
                elif table_name == "NEW_QUESTION":
                    q_id = parsed.get("Question_Id")
                    std_code = parsed.get("Std_Ref")
                    text = parsed.get("Question_Text")
                    category = parsed.get("Category") or "Control"
                    if q_id:
                        questions[q_id] = {
                            "id": q_id,
                            "std_code": std_code,
                            "text": text,
                            "category": category
                        }
                        
                # 6. MATURITY_MODELS
                elif table_name == "MATURITY_MODELS":
                    model_id = parsed.get("Maturity_Model_Id")
                    model_name = parsed.get("Model_Name")
                    model_title = parsed.get("Model_Title") or model_name
                    if model_id:
                        maturity_models[str(model_id)] = {
                            "name": model_name,
                            "title": model_title
                        }
                        
                # 7. MATURITY_LEVELS
                elif table_name == "MATURITY_LEVELS":
                    lvl_id = parsed.get("Maturity_Level_Id")
                    lvl_name = parsed.get("Level_Name")
                    if lvl_id and lvl_name:
                        maturity_levels[str(lvl_id)] = lvl_name
                        
                # 8. MATURITY_QUESTIONS
                elif table_name == "MATURITY_QUESTIONS":
                    q_id = parsed.get("Mat_Question_Id")
                    title = parsed.get("Question_Title")
                    text = parsed.get("Question_Text")
                    supp = parsed.get("Supplemental_Info") or ""
                    cat = parsed.get("Category") or "General"
                    lvl_id = parsed.get("Maturity_Level_Id")
                    model_id = parsed.get("Maturity_Model_Id")
                    if q_id and model_id:
                        maturity_questions[str(q_id)] = {
                            "id": q_id,
                            "title": title,
                            "text": text,
                            "description": supp,
                            "category": cat,
                            "level_id": str(lvl_id) if lvl_id else None,
                            "model_id": str(model_id)
                        }

    print("\n------------------------------")
    print(f"Parsed {sql_files_count} SQL files recursively.")
    print(f"Total Standards (SETS) found: {len(sets)}")
    print(f"Total Requirements (NEW_REQUIREMENT) found: {len(requirements)}")
    print(f"Total Questions (NEW_QUESTION) found: {len(questions)}")
    print(f"Total Maturity Models found: {len(maturity_models)}")
    print(f"Total Maturity Levels found: {len(maturity_levels)}")
    print(f"Total Maturity Questions found: {len(maturity_questions)}")
    
    print("\nMaturity Models index:")
    for mid, m in sorted(maturity_models.items(), key=lambda x: int(x[0])):
        q_count = sum(1 for q in maturity_questions.values() if q["model_id"] == mid)
        print(f"  - Model {mid}: {m['name']} ({m['title']}) -> {q_count} questions")
        
    print("\nChecklist Standards index:")
    for set_name, full_name in sorted(sets.items()):
        req_count = len(req_sets.get(set_name, []))
        q_count = len(q_sets.get(set_name, []))
        if req_count > 0 or q_count > 0:
            print(f"  - Set {set_name}: {full_name[:50]}... -> {req_count} reqs, {q_count} qs")

if __name__ == "__main__":
    main()
