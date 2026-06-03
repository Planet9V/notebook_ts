import os
import re

locales_dir = "/Users/jimmcknney/notebook_tetrel/frontend/src/lib/locales"
en_us_path = os.path.join(locales_dir, "en-US", "index.ts")

# Read en-US/index.ts
with open(en_us_path, "r", encoding="utf-8") as f:
    en_content = f.read()

# Extract compliance: to the end of the file (excluding final closing brace)
lines = en_content.splitlines()
compliance_start_idx = -1
for idx, line in enumerate(lines):
    if line.strip().startswith("compliance: {"):
        compliance_start_idx = idx
        break

if compliance_start_idx == -1:
    raise Exception("Could not find compliance block start in en-US/index.ts")

# Grab lines from compliance_start_idx to 1074 (inclusive)
# Note that line 1075 is the final "}" of en-US
compliance_and_agents_text = "\n".join(lines[compliance_start_idx:1074])

print(f"Extracted compliance and agents text ({len(compliance_and_agents_text)} chars)")

# list all directories in locales_dir except en-US and nl-NL
locale_codes = [d for d in os.listdir(locales_dir) if os.path.isdir(os.path.join(locales_dir, d)) and d not in ["en-US", "nl-NL"]]

for code in locale_codes:
    file_path = os.path.join(locales_dir, code, "index.ts")
    if not os.path.exists(file_path):
        continue
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # If "compliance:" is already in the file, skip
    if "compliance:" in content:
        print(f"Skipping {code} (already contains compliance)")
        continue
        
    # We replace the final '},\n}' or similar with our compliance + agents block
    # Let's match the trailing '},\n}' with potential trailing whitespace/newlines.
    modified_content = re.sub(
        r'\}\s*,\s*\n\}\s*;?\s*$',
        '},\n  ' + compliance_and_agents_text + '\n}',
        content
    )
    
    if modified_content == content:
        # Fallback to replace '}\n}' if '},\n}' was not found
        modified_content = re.sub(
            r'\}\s*\n\}\s*;?\s*$',
            '}\n  ' + compliance_and_agents_text + '\n}',
            content
        )
        
    if modified_content == content:
        print(f"Failed to find match for {code}")
    else:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(modified_content)
        print(f"Successfully synced compliance and agents to {code}")
