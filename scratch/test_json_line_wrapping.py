import subprocess

def main():
    query_str = (
        "SELECT "
        "  q.Mat_Question_Id, "
        "  q.Question_Title, "
        "  q.Question_Text, "
        "  q.Supplemental_Info, "
        "  q.Category, "
        "  q.Sub_Category, "
        "  m.Model_Name, "
        "  l.Level_Name "
        "FROM MATURITY_QUESTIONS q "
        "JOIN MATURITY_MODELS m ON q.Maturity_Model_Id = m.Maturity_Model_Id "
        "LEFT JOIN MATURITY_LEVELS l ON q.Maturity_Level_Id = l.Maturity_Level_Id "
        "WHERE q.Mat_Question_Id = 1021 FOR JSON PATH;"
    )
    
    cmd = [
        "docker", "exec", "-i", "cset-mssql",
        "/opt/mssql-tools/bin/sqlcmd",
        "-U", "sa", "-P", "Password123",
        "-d", "CSET", "-y", "0",
        "-Q", f"SET NOCOUNT ON; {query_str}"
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    print("RAW STDOUT:")
    print(repr(result.stdout))

if __name__ == "__main__":
    main()
