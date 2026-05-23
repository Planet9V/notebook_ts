import os
import re

cset_dir = "/Users/jimmcknney/cset_clone"

def parse_sql_file(path, target_set):
    # We want to find requirements in REQUIREMENT_SETS mapping to target_set
    req_ids = set()
    
    try:
        with open(path, "r", encoding="utf-16le") as fh:
            lines = fh.readlines()
    except Exception:
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                lines = fh.readlines()
        except Exception:
            return []
            
    for line in lines:
        if "INSERT INTO [dbo].[REQUIREMENT_SETS]" in line or "INSERT INTO REQUIREMENT_SETS" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    vals = [v.strip("' ") for v in vals_part[1:-1].split(",")]
                    if len(vals) >= 2:
                        req_id = vals[0]
                        set_name = vals[1]
                        if set_name == target_set:
                            req_ids.add(req_id)
                            
    # Now parse the actual requirements from NEW_REQUIREMENT matching those ids
    requirements = []
    for line in lines:
        if "INSERT INTO [dbo].[NEW_REQUIREMENT]" in line or "INSERT INTO NEW_REQUIREMENT" in line:
            parts = line.split("VALUES")
            if len(parts) >= 2:
                vals_part = parts[1].strip()
                if vals_part.startswith("("):
                    # Hand-parse values
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
                        
                        # Check if matched by REQUIREMENT_SETS or by NEW_REQUIREMENT Set_Name column if present
                        matched = req_id in req_ids
                        if not matched and len(vals) > 5:
                            matched = vals[5].strip("' ") == target_set
                            
                        if matched:
                            title = vals[1].strip("' ")
                            text = vals[2].strip("' ")
                            category = vals[3].strip("' ") if len(vals) > 3 else ""
                            subcat = vals[4].strip("' ") if len(vals) > 4 else ""
                            requirements.append({
                                "id": req_id,
                                "title": title,
                                "text": text,
                                "category": category,
                                "subcat": subcat
                            })
                            
    if req_ids or requirements:
        print(f"File {os.path.basename(path)}: found {len(req_ids)} mappings and {len(requirements)} requirement definitions.")
    return requirements

def main():
    target_set = "TSA2018"
    
    all_requirements = []
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            reqs = parse_sql_file(path, target_set)
            if reqs:
                all_requirements.extend(reqs)
                
    print(f"\nTotal parsed requirements for '{target_set}': {len(all_requirements)}")
    for r in all_requirements[:15]:
        print(f"\nID: {r['id']}")
        print(f"Title: {r['title']}")
        print(f"Category: {r['category']} / {r['subcat']}")
        print(f"Text: {r['text'][:300]}...")

if __name__ == "__main__":
    main()
