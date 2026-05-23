import os
import re

cset_dir = "/Users/jimmcknney/cset_clone"

def main():
    print("Parsing CSET Maturity Models...")
    
    # Insert patterns for MATURITY_MODELS
    mat_pattern = re.compile(
        r"INSERT INTO\s+(?:\[dbo\]\.)?\[MATURITY_MODELS\]\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\);?",
        re.IGNORECASE
    )
    
    models = {}
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            try:
                with open(path, "r", encoding="utf-16le") as fh:
                    content = fh.read()
            except Exception:
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                except Exception:
                    continue
            
            for match in mat_pattern.finditer(content):
                cols = [c.strip(" []") for c in match.group(1).split(",")]
                vals_raw = match.group(2)
                
                # Simple split respecting quotes
                vals = []
                curr = []
                in_quotes = False
                escaped = False
                for char in vals_raw:
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
                
                val_dict = dict(zip(cols, vals))
                model_name = val_dict.get("Model_Name", "").strip("' ")
                model_title = val_dict.get("Model_Title", "").strip("' ")
                
                if model_name and model_title:
                    models[model_name] = model_title
                    
    print(f"Found {len(models)} Maturity Models:")
    for k, v in sorted(models.items()):
        print(f"  - {k}: {v}")

if __name__ == "__main__":
    main()
