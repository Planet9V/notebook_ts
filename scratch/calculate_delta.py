import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def compare():
    # Let's inspect the files we generated in v5 and v6 to see how many controls are defined.
    # In v5 we generated a master JSON list, in v6 we also have cset_catalog.json
    
    import json
    
    # We can load the newly compiled catalog
    catalog_path = "/Users/jimmcknney/notebook_tetrel/scripts/cset_catalog.json"
    if not os.path.exists(catalog_path):
        print("Catalog not found")
        return
        
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    # We can compare with v5's catalog if it exists, or look at what v5 generated
    # Let's parse v5 specs_db from the file scratch/generate_deep_individual_frameworks_v5.py
    v5_path = "/Users/jimmcknney/notebook_tetrel/scratch/generate_deep_individual_frameworks_v5.py"
    if not os.path.exists(v5_path):
        print("v5 file not found")
        return
        
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
        
        # Now let's calculate the delta between v5_specs (the original base specs) and the final active catalog
        print("Framework | Base Count (v5) | Enriched Count (v6) | Delta (Added)")
        print("---|---|---|---")
        
        total_v5 = 0
        total_v6 = 0
        
        # Let's sort the frameworks alphabetically
        for fw_id in sorted(catalog.keys()):
            v5_cnt = len(v5_specs.get(fw_id, []))
            v6_cnt = len(catalog[fw_id])
            delta = v6_cnt - v5_cnt
            
            total_v5 += v5_cnt
            total_v6 += v6_cnt
            
            print(f"**{fw_id}** | {v5_cnt} | {v6_cnt} | +{delta}")
            
        print(f"**TOTAL** | {total_v5} | {total_v6} | +{total_v6 - total_v5}")

if __name__ == "__main__":
    compare()
