import os

cset_dir = "/Users/jimmcknney/cset_clone"

def main():
    print("Searching for CSET data tables...")
    targets = [
        "INSERT INTO [dbo].[NEW_QUESTION]",
        "INSERT INTO [dbo].[NEW_REQUIREMENT]",
        "INSERT INTO [dbo].[SETS]",
        "INSERT INTO [dbo].[GEN_FILE]"
    ]
    
    matches = {t: [] for t in targets}
    
    for root, dirs, files in os.walk(cset_dir):
        # Skip .git and binary folders
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            try:
                # Read as UTF-16LE first
                with open(path, "r", encoding="utf-16le") as fh:
                    content = fh.read()
            except Exception:
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        content = fh.read()
                except Exception:
                    continue
            
            for t in targets:
                if t in content:
                    matches[t].append(path)
                    
    for t, paths in matches.items():
        print(f"\n{t}: found in {len(paths)} files")
        for p in paths[:10]:
            print(f"  - {p}")

if __name__ == "__main__":
    main()
