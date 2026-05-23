import os
from test_bulletproof_parser import extract_insert_columns_and_values

def main():
    cset_dir = "/Users/jimmcknney/cset_clone"
    sets = {}
    maturity_models = {}
    maturity_levels = {}
    maturity_questions_count = {} # model_id -> count
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
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
                
                if table_name == "SETS":
                    sname = parsed.get("Set_Name")
                    fname = parsed.get("Full_Name") or parsed.get("Short_Name")
                    if sname and fname:
                        sets[sname] = fname
                elif table_name == "MATURITY_MODELS":
                    mid = parsed.get("Maturity_Model_Id")
                    mname = parsed.get("Model_Name")
                    if mid:
                        maturity_models[str(mid)] = mname
                elif table_name == "MATURITY_LEVELS":
                    lid = parsed.get("Maturity_Level_Id")
                    lname = parsed.get("Level_Name")
                    model_id = parsed.get("Maturity_Model_Id")
                    val = parsed.get("Level_Value")
                    if lid and lname:
                        maturity_levels[str(lid)] = {
                            "name": lname,
                            "model_id": str(model_id) if model_id else None,
                            "val": val
                        }
                elif table_name == "MATURITY_QUESTIONS":
                    model_id = parsed.get("Maturity_Model_Id")
                    if model_id:
                        mid_str = str(model_id)
                        maturity_questions_count[mid_str] = maturity_questions_count.get(mid_str, 0) + 1
                        
    print("MATURITY MODELS:")
    for mid, name in sorted(maturity_models.items(), key=lambda x: int(x[0])):
        print(f"Model {mid}: {name} ({maturity_questions_count.get(mid, 0)} questions)")
        
    print("\nMATURITY LEVELS:")
    for lid, info in sorted(maturity_levels.items(), key=lambda x: int(x[0])):
        model_name = maturity_models.get(info['model_id'], "Unknown")
        print(f"Level ID {lid}: {info['name']} (Model {info['model_id']} - {model_name}, Value: {info['val']})")

if __name__ == "__main__":
    main()
