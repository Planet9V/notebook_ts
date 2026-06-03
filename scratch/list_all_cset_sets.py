import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.generate_cset_library import (
    CSET_MATURITY_MODELS,
    CSET_SETS,
    run_global_cset_parser,
)


def main():
    print("Initiating full SQL parsing...")
    run_global_cset_parser()
    
    print("\n--- ALL CSET STANDARDS (SETS) PARSED FROM SQL ---")
    for key, name in sorted(CSET_SETS.items()):
        print(f"  - Key: '{key}' -> Name: '{name}'")
        
    print("\n--- ALL CSET MATURITY MODELS PARSED FROM SQL ---")
    for key, info in sorted(CSET_MATURITY_MODELS.items()):
        print(f"  - Model ID: '{key}' -> Name: '{info['name']}' / Title: '{info['title']}'")

if __name__ == "__main__":
    main()
