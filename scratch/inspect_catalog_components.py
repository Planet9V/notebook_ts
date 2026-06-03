import json
import os

catalog_path = "/Users/jimmcknney/notebook_tetrel/scripts/cset_catalog.json"
if os.path.exists(catalog_path):
    with open(catalog_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("Catalog keys:", list(data.keys()) if isinstance(data, dict) else "Not a dict")
    if isinstance(data, dict):
        for k in list(data.keys())[:5]:
            val = data[k]
            print(f"Key: {k}, Type: {type(val)}")
            if isinstance(val, list) and len(val) > 0:
                print("First item:", val[0])
            elif isinstance(val, dict):
                print("Keys:", list(val.keys())[:5])
else:
    print("Catalog path does not exist!")
