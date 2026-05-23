import os

cset_dir = "/Users/jimmcknney/cset_clone"

def main():
    print("Robustly scanning CSET standard sets...")
    
    # We will search for lines starting with or containing "INSERT INTO [dbo].[SETS]"
    sets = {}
    
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
                if "INSERT INTO [dbo].[SETS]" in line or "INSERT INTO SETS" in line:
                    # Parse out the VALUES block
                    if "VALUES" in line:
                        parts = line.split("VALUES")
                        vals_part = parts[1].strip()
                        if vals_part.startswith("("):
                            # Extract everything inside the parentheses
                            # Hand-parse values separated by commas, respecting quotes
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
                            
                            if len(vals) >= 2:
                                set_name = vals[0].strip("' ")
                                full_name = vals[1].strip("' ")
                                sets[set_name] = full_name
                                
    print(f"Found {len(sets)} standard sets in CSET:")
    for k in sorted(sets.keys()):
        print(f"  - {k}: {sets[k]}")

if __name__ == "__main__":
    main()
