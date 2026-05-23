import re

def find_unique_sets():
    sql_file = "/Users/jimmcknney/cset_clone/CSETWebApi/CSETWeb_Api/CSETWebCore.UpgradeLibrary/VersionUpgrader/SQL/1001_to_101_data2.sql"
    with open(sql_file, "r", encoding="utf-8", errors="ignore") as fh:
        content = fh.read()
        
    set_names = set()
    matches = re.findall(r"Original_Set_Name\s*=\s*N?'([^']*)'", content)
    for m in matches:
        set_names.add(m)
        
    print(f"Total unique sets found: {len(set_names)}")
    print(sorted(list(set_names)))

if __name__ == "__main__":
    find_unique_sets()
