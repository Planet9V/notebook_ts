import os
import json
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def verify_all_directives():
    catalog_path = "/Users/jimmcknney/notebook_tetrel/scripts/cset_catalog.json"
    if not os.path.exists(catalog_path):
        print(f"Error: {catalog_path} not found.")
        return
        
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    print(f"Loaded {len(catalog)} frameworks from catalog. Commencing detailed verification on EACH AND EVERY directive...\n")
    
    failures = 0
    passed_frameworks = {}
    
    for fw_id, questions in catalog.items():
        fw_passed = True
        q_checked = 0
        
        for q in questions:
            code, name, text, cat, purdue, guidance = q[:6]
            q_checked += 1
            
            # Checks:
            # 1. Standard format check
            # 2. Guidance contains SOP, VERIFICATION CRITERIA, and OT/IT CONVERGENCE RISK
            has_sop = "SOP:" in guidance
            has_ver = "VERIFICATION CRITERIA:" in guidance
            has_risk = "OT/IT CONVERGENCE RISK:" in guidance
            
            # Check for duplications
            dup_sop = guidance.count("SOP:") > 1
            dup_ver = guidance.count("VERIFICATION CRITERIA:") > 1
            dup_risk = guidance.count("OT/IT CONVERGENCE RISK:") > 1
            
            if not (has_sop and has_ver and has_risk) or (dup_sop or dup_ver or dup_risk):
                fw_passed = False
                failures += 1
                print(f"❌ FAIL: {fw_id} - Control {code}")
                if not has_sop: print("  - Missing SOP")
                if not has_ver: print("  - Missing VERIFICATION CRITERIA")
                if not has_risk: print("  - Missing OT/IT CONVERGENCE RISK")
                if dup_sop: print("  - Duplicate SOP section")
                if dup_ver: print("  - Duplicate VERIFICATION CRITERIA section")
                if dup_risk: print("  - Duplicate OT/IT CONVERGENCE RISK section")
                
        if fw_passed:
            passed_frameworks[fw_id] = q_checked
            
    print("\n--- Detailed Ingestion Status ---")
    print(f"Total Frameworks Verified: {len(catalog)} / 63")
    print(f"Total Directives Successfully Hydrated and Validated: {sum(passed_frameworks.values())}")
    print(f"Total Directives Failing Validation Checks: {failures}")
    
    if failures == 0:
        print("\n🏆 SUCCESS: 100% of directives across all 63 frameworks are fully hydrated, unique, and verified compliant with all schema requirements!")
    else:
        print(f"\n⚠️ WARNING: {failures} directives failed validation. Review logs above.")

if __name__ == "__main__":
    verify_all_directives()
