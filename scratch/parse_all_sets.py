import os
import re
from collections import defaultdict


def scan_repository():
    cset_dir = "/Users/jimmcknney/cset_clone"
    counts = defaultdict(int)
    
    # We will search for Original_Set_Name in any context inside all SQL files
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
            
            # Look for: Original_Set_Name field or Set_Name field in INSERTs or UPDATEs
            # Let's search for "Original_Set_Name" or similar and extract the value next to it
            matches = re.findall(r"Original_Set_Name\s*=\s*N?'([^']*)'", content)
            for m in matches:
                counts[m] += 1
                
            # Also check for sets from INSERT INTO [dbo].[NEW_REQUIREMENT] or [dbo].[REQUIREMENT_SETS]
            # Since REQUIREMENT_SETS has Set_Name, let's extract that too!
            # INSERT INTO [dbo].[REQUIREMENT_SETS] ... VALUES (123, 'SET_NAME', 45)
            # We can match: VALUES\s*\(\s*\d+\s*,\s*N?'([^']*)'
            req_set_matches = re.findall(r"INSERT\s+INTO\s+\[dbo\]\.\[REQUIREMENT_SETS\].*?VALUES\s*\(\s*\d+\s*,\s*N?'([^']*)'", content, re.IGNORECASE)
            for m in req_set_matches:
                counts[m] += 1
                
            # Let's also look for general Set_Name mapping
            # INSERT INTO [dbo].[SETS] ... VALUES (..., 'SET_NAME', ...)
            
    print(f"Total unique sets found across repository: {len(counts)}")
    for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True):
        print(f"{k}: {v}")

if __name__ == "__main__":
    scan_repository()
