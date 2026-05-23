import os
import sys

# Ensure project root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.generate_cset_library import (
    run_global_cset_parser,
    get_cset_parsed_questions,
    FRAMEWORKS
)

def main():
    print("Initiating full SQL parsing...")
    run_global_cset_parser()
    
    print("\nAuditing real CSET SQL question counts for all 63 frameworks:")
    found_count = 0
    missing = []
    
    for fw in FRAMEWORKS:
        fw_id = fw["id"]
        fw_name = fw["name"]
        
        # Get real CSET parsed questions
        parsed_qs = get_cset_parsed_questions(fw)
        q_count = len(parsed_qs)
        
        print(f"  - {fw_id} ({fw_name}): {q_count} real questions parsed")
        if q_count > 0:
            found_count += 1
        else:
            missing.append(fw_id)
            
    print(f"\nTotal frameworks with real CSET SQL data: {found_count} / {len(FRAMEWORKS)}")
    print(f"Frameworks with 0 real questions parsed: {len(missing)}")
    print("Missing list:", missing)

if __name__ == "__main__":
    main()
