import json
import subprocess

def run_mssql_json_query_no_strip(query_str):
    query_str = query_str.strip().rstrip(";")
    if "FOR JSON PATH" not in query_str.upper():
        query_str = f"{query_str} FOR JSON PATH;"
        
    cmd = [
        "docker", "exec", "-i", "cset-mssql",
        "/opt/mssql-tools/bin/sqlcmd",
        "-U", "sa", "-P", "Password123",
        "-d", "CSET", "-y", "0",
        "-Q", f"SET NOCOUNT ON; {query_str}"
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    if result.returncode != 0:
        raise Exception(f"SQL Execution failed: {result.stderr}")
        
    lines = []
    for line in result.stdout.splitlines():
        line_stripped = line.strip()
        if not line_stripped or "rows affected" in line_stripped:
            continue
        if line_stripped.startswith("---") and all(c == '-' for c in line_stripped):
            continue
        # We append the original line with its spaces, but strip the trailing \r or \n
        lines.append(line.rstrip("\r\n"))
        
    full_json_str = "".join(lines)
    return json.loads(full_json_str)

def main():
    print("Testing large json fetch with no-strip merging logic...")
    sql_maturity_query = (
        "SELECT "
        "  q.Mat_Question_Id, "
        "  m.Model_Name "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "LEFT JOIN MATURITY_LEVELS l ON q.Maturity_Level_Id = l.Maturity_Level_Id;"
    )
    rows = run_mssql_json_query_no_strip(sql_maturity_query)
    print(f"Total maturity questions fetched: {len(rows)}")
    
    # Check for CRE+MIL or SD02Series
    counts = {}
    for r in rows:
        name = r["Model_Name"]
        counts[name] = counts.get(name, 0) + 1
        
    print("Maturity Model Name counts:")
    for name, cnt in sorted(counts.items()):
        print(f"  - '{name}': {cnt}")

if __name__ == "__main__":
    main()
