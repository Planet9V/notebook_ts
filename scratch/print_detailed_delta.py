import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def print_detailed_delta():
    catalog_path = "/Users/jimmcknney/notebook_tetrel/scripts/cset_catalog.json"
    v5_path = "/Users/jimmcknney/notebook_tetrel/scratch/generate_deep_individual_frameworks_v5.py"
    
    if not os.path.exists(catalog_path) or not os.path.exists(v5_path):
        print("Missing required files")
        return
        
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    with open(v5_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    start_idx = content.find('specs_db["IEC_62443_3_3"] =')
    if start_idx != -1:
        line_start_idx = content.rfind('\n', 0, start_idx) + 1
        raw_specs = content[line_start_idx:]
        end_idx = raw_specs.find('print("Step 3: Building')
        if end_idx != -1:
            raw_specs = raw_specs[:end_idx]
            
        import textwrap
        dict_code = "specs_db = {}\n" + textwrap.dedent(raw_specs)
        namespace = {"specs_db": {}}
        exec(dict_code, namespace)
        v5_specs = namespace["specs_db"]
        
        # Let's print out the exact delta (additions) for each framework
        for fw_id in sorted(catalog.keys()):
            v5_codes = set()
            short = fw_id.split('_')[0]
            
            # Map v5 specs to standard code format
            v5_source = v5_specs.get(fw_id, [])
            for code_sfx, t_name, _, _, _, _ in v5_source:
                code = f"{short}-{code_sfx.replace(' ', '_')}"
                if "NERC_CIP" in fw_id:
                    sub_code = fw_id.replace("NERC_CIP_", "CIP")
                    code = f"{sub_code}-{code_sfx.replace(' ', '_')}"
                elif "IEC_62443" in fw_id:
                    sub_code = fw_id.replace("IEC_", "")
                    code = f"{sub_code}-{code_sfx.replace(' ', '_')}"
                elif "CMMC" in fw_id:
                    code = f"{fw_id}-{code_sfx.replace(' ', '_')}"
                elif "AWWA" in fw_id:
                    code = f"{fw_id}-{code_sfx.replace(' ', '_')}"
                elif "NIST" in fw_id:
                    code = f"{fw_id}-{code_sfx.replace(' ', '_')}"
                v5_codes.add(code)
                
            v6_questions = catalog[fw_id]
            additions = []
            
            for q in v6_questions:
                code = q[0]
                name = q[1]
                # If code is not in v5_codes, it's a new addition!
                if code not in v5_codes:
                    additions.append((code, name))
                    
            if additions:
                print(f"\n### 📘 {fw_id} (Delta: +{len(additions)})")
                for code, name in additions:
                    # Strip standard framework name prefix from name to keep it clean
                    clean_name = name.split(" - ", 1)[-1] if " - " in name else name
                    print(f"- `{code}`: {clean_name}")

if __name__ == "__main__":
    print_detailed_delta()
