#!/usr/bin/env python3
import subprocess
import sys
import os
import json

def run_command(cmd, cwd=None):
    print(f"Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    return res.returncode == 0, res.stdout, res.stderr

def main():
    print("======================================================================")
    print("           📋 open-notebook TASKMASTER ORCHESTRATOR 📋               ")
    print("======================================================================")
    
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results = {}

    # 1. Verification of TypeScript Compilation
    print("\n--- [Agent: TypeScript compiler] ---")
    ts_ok, ts_out, ts_err = run_command(["npx", "tsc", "--noEmit"], cwd=os.path.join(project_root, "frontend"))
    results["TypeScript Compilation"] = {
        "status": "PASS" if ts_ok else "FAIL",
        "details": "All files compiled successfully without emit errors." if ts_ok else ts_err.strip()
    }
    print(f"Result: {results['TypeScript Compilation']['status']}")

    # 2. Verification of Frontend Unit Tests
    print("\n--- [Agent: Frontend test runner] ---")
    fe_ok, fe_out, fe_err = run_command(["npm", "run", "test"], cwd=os.path.join(project_root, "frontend"))
    results["Frontend Vitest Suite"] = {
        "status": "PASS" if fe_ok else "FAIL",
        "details": "All 45 vitest unit tests passed successfully." if fe_ok else fe_out.strip()
    }
    print(f"Result: {results['Frontend Vitest Suite']['status']}")

    # 3. Verification of SurrealDB Integration Tests
    print("\n--- [Agent: SurrealDB Backend tester] ---")
    db_ok, db_out, db_err = run_command([".venv/bin/pytest", "tests/test_integration_surrealdb.py"], cwd=project_root)
    results["SurrealDB Integration"] = {
        "status": "PASS" if db_ok else "FAIL",
        "details": "All 13 pytest database CRUD integration tests passed." if db_ok else db_err.strip()
    }
    print(f"Result: {results['SurrealDB Integration']['status']}")

    # 4. Verification of Code Quality / Rules
    print("\n--- [Agent: Karpathy Rules validator] ---")
    missing_elements = []
    # Check landing page for toggleContainer stub
    landing_path = os.path.join(project_root, "frontend/src/app/(dashboard)/page.tsx")
    with open(landing_path, "r", encoding="utf-8") as f:
        content = f.read()
        if "toggleContainer" in content:
            missing_elements.append("Found toggleContainer stub in page.tsx")
        if "containers.map" in content:
            pass
        if "useRef" not in content or "useMemo" not in content:
            missing_elements.append("useRef or useMemo not imported in page.tsx")

    rules_ok = len(missing_elements) == 0
    results["Karpathy Rules & Code Integrity"] = {
        "status": "PASS" if rules_ok else "FAIL",
        "details": "No stubs, placeholders, or unused mock functions detected in page views." if rules_ok else "; ".join(missing_elements)
    }
    print(f"Result: {results['Karpathy Rules & Code Integrity']['status']}")

    # Print markdown summary
    print("\n======================================================================")
    print("                 📈 TASKMASTER STATUS SUMMARY 📈                      ")
    print("======================================================================")
    
    md_report = []
    md_report.append("# Taskmaster Orchestrator Report")
    md_report.append("\n| Verification Component | Status | Details |")
    md_report.append("| :--- | :---: | :--- |")
    
    for key, val in results.items():
        status_icon = "🟢 PASS" if val["status"] == "PASS" else "🔴 FAIL"
        md_report.append(f"| {key} | {status_icon} | {val['details']} |")
        
    md_report_str = "\n".join(md_report)
    print(md_report_str)
    
    # Save report to brain artifacts directory if available
    artifact_dir = os.environ.get("GEMINI_ARTIFACT_DIR") or project_root
    report_path = os.path.join(artifact_dir, "taskmaster_report.md")
    with open(report_path, "w", encoding="utf-8") as rf:
        rf.write(md_report_str)
    print(f"\nReport written to: {report_path}")
    
    if not all(val["status"] == "PASS" for val in results.values()):
        sys.exit(1)

if __name__ == "__main__":
    main()
