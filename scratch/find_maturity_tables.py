import os
import re

cset_dir = "/Users/jimmcknney/cset_clone"

def main():
    print("Searching for MATURITY tables...")
    
    mat_pattern = re.compile(
        r"INSERT INTO\s+(?:\[dbo\]\.)?\[(MATURITY_[A-Z0-9_]+)\]",
        re.IGNORECASE
    )
    
    found_tables = {}
    
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
                table_name = match.group(1).upper()
                if table_name not in found_tables:
                    found_tables[table_name] = []
                found_tables[table_name].append(path)
                
    for table_name, paths in sorted(found_tables.items()):
        print(f"Table: {table_name} -> found in {len(paths)} files")
        for p in list(set(paths))[:5]:
            print(f"  - {os.path.basename(p)}")

if __name__ == "__main__":
    main()
