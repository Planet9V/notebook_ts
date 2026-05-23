import os
import json

def audit():
    blueprint_dir = "/Users/jimmcknney/notebook_tetrel/data/blueprints"
    files = sorted([f for f in os.listdir(blueprint_dir) if f.endswith(".json")])
    
    print(f"Auditing {len(files)} files in {blueprint_dir}:")
    under_10 = []
    under_50 = []
    
    for filename in files:
        filepath = os.path.join(blueprint_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                q_count = len(data.get("questions", []))
                print(f"  - {filename}: {q_count} questions")
                if q_count < 10:
                    under_10.append((filename, q_count))
                if q_count < 50:
                    under_50.append((filename, q_count))
            except Exception as e:
                print(f"Error reading {filename}: {e}")
                
    print("\nSummary:")
    print(f"Total files under 10 questions: {len(under_10)}")
    for f, count in under_10:
        print(f"  {f}: {count}")
        
    print(f"Total files under 50 questions: {len(under_50)}")
    print(f"Number of files with 50+ questions: {len(files) - len(under_50)}")

if __name__ == "__main__":
    audit()
