import os
import re

cset_dir = "/Users/jimmcknney/cset_clone"

def main():
    print("Compiling all CSET standard sets...")
    
    # Matches INSERT INTO [dbo].[SETS] or INSERT INTO SETS
    set_pattern = re.compile(
        r"INSERT INTO\s+(?:\[dbo\]\.)?\[SETS\]\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\);",
        re.IGNORECASE
    )
    
    sets = {}
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            try:
                # UTF-16LE or UTF-8
                with open(path, "r", encoding="utf-16le") as fh:
                    content = fh.read()
            except Exception:
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                except Exception:
                    continue
            
            # Simple parse
            for match in set_pattern.finditer(content):
                cols = [c.strip(" []") for c in match.group(1).split(",")]
                vals_raw = match.group(2)
                
                # Parse single quote values
                vals = []
                current_val = []
                in_quotes = False
                escaped = False
                for char in vals_raw:
                    if escaped:
                        current_val.append(char)
                        escaped = False
                    elif char == "'":
                        in_quotes = not in_quotes
                        current_val.append(char)
                    elif char == "," and not in_quotes:
                        vals.append("".join(current_val).strip())
                        current_val = []
                    else:
                        current_val.append(char)
                vals.append("".join(current_val).strip())
                
                val_dict = dict(zip(cols, vals))
                set_name = val_dict.get("Set_Name", "").strip("' ")
                full_name = val_dict.get("Full_Name", "").strip("' ")
                
                if set_name and full_name:
                    sets[set_name] = full_name
                    
    print(f"Parsed {len(sets)} unique standard sets:")
    for k, v in sorted(sets.items()):
        print(f"  {k} -> {v}")

if __name__ == "__main__":
    main()
