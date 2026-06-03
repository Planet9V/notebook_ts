#!/usr/bin/env python3
import json
import os


def main():
    catalog_path = "scripts/cset_catalog.json"
    frameworks_def_path = "scripts/generate_cset_library.py"
    output_dir = "docs/blueprints"
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Load the dynamic JSON catalog data
    if not os.path.exists(catalog_path):
        print(f"Error: {catalog_path} not found.")
        return
        
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    # 2. Extract framework metadata from generate_cset_library.py
    # We will parse the FRAMEWORKS list from the python script to get the name, description, etc.
    frameworks_metadata = {}
    
    try:
        with open(frameworks_def_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        # Quick parsing of FRAMEWORKS array using json-like structure or manual scanning
        start_idx = -1
        for idx, line in enumerate(lines):
            if "FRAMEWORKS = [" in line:
                start_idx = idx
                break
                
        if start_idx != -1:
            # We'll read until the matching brace or scan lines
            content_lines = []
            brace_count = 0
            for idx in range(start_idx, len(lines)):
                line = lines[idx]
                content_lines.append(line)
                brace_count += line.count("[") - line.count("]")
                if idx > start_idx and brace_count == 0:
                    break
            
            # Reconstruct the list variable using python's eval in a safe namespace
            fw_code = "".join(content_lines)
            namespace = {}
            exec(fw_code, namespace)
            frameworks = namespace.get("FRAMEWORKS", [])
            for fw in frameworks:
                frameworks_metadata[fw["id"]] = fw
    except Exception as e:
        print(f"Warning: Failed to extract metadata programmatically: {e}. Using fallback.")
        
    print(f"Found {len(catalog)} frameworks in catalog and {len(frameworks_metadata)} framework metadata entries.")
    
    # 3. Generate a beautiful, premium markdown file for each framework
    count = 0
    for fw_id, questions in catalog.items():
        metadata = frameworks_metadata.get(fw_id, {
            "name": fw_id.replace("_", " "),
            "fullName": fw_id.replace("_", " ") + " Compliance Framework",
            "description": "Compliance standards and security controls parsed from CSET catalog.",
            "category": "Industrial Security Standards",
            "sector": "Cross-Sector"
        })
        
        fw_name = metadata.get("name")
        fw_fullname = metadata.get("fullName")
        fw_desc = metadata.get("description")
        fw_category = metadata.get("category")
        fw_sector = metadata.get("sector")
        
        md_content = f"""# 📘 Compliance Blueprint: {fw_name}
## {fw_fullname}

---

## 📋 Framework Overview
* **Framework ID**: `{fw_id}`
* **Category**: `{fw_category}`
* **Industry Sector**: `{fw_sector}`
* **Control Scope**: Contains {len(questions)} high-fidelity operational technology (OT) and information technology (IT) compliance checks.

> [!NOTE]
> This document serves as the official **Record of Note** for the {fw_name} framework. All control questions, standard codes, and Purdue Model mappings are compiled directly from authentic CSET and industry standard definitions.

### Description
{fw_desc}

---

## 📐 Purdue Model Mapping

Control levels are logically aligned with the Purdue Enterprise Reference Architecture (PERA) to isolate process control boundaries from enterprise systems:

```mermaid
graph TD
    subgraph Enterprise Zone [Enterprise Zone]
        L5["Level 5: Cloud / External Services"]
        L4["Level 4: Enterprise Office Network"]
    end
    
    subgraph Operations DMZ [Operations DMZ]
        L35["Level 3.5: Operational DMZ / Jump Hosts"]
    end
    
    subgraph Industrial Zone [Industrial Zone]
        L3["Level 3: Operations Systems / SCADA HMI"]
        L2["Level 2: Basic Control Systems / HMIs / SCADA Masters"]
        L1["Level 1: Local Automation / PLUs / RTUs / Flow Computers"]
        L0["Level 0: Physical Process Sensors / Actuators / Enclosures"]
    end

    classDef enterprise fill:#f9f,stroke:#333,stroke-width:2px;
    classDef dmz fill:#ffc,stroke:#333,stroke-width:2px;
    classDef industrial fill:#bbf,stroke:#333,stroke-width:2px;

    class L5,L4 enterprise;
    class L35 dmz;
    class L3,L2,L1,L0 industrial;
```

---

## 🛡️ Control Matrix

The following table documents every single security control question, corresponding category, mapped Purdue Model level, and operational engineering validation guidance.

| Standard Code | Question Text | Category | Purdue Level | Guidance / Description |
| :--- | :--- | :--- | :---: | :--- |
"""
        
        for q in questions:
            # Format: [code, name, text, category, level, guidance]
            q_code = q[0]
            q_name = q[1]
            q_text = q[2]
            q_cat = q[3]
            q_level = q[4]
            q_guidance = q[5] if len(q) > 5 else f"Verify compliance against {fw_name} requirement {q_code}."
            
            # Clean up escape characters or single quotes
            q_text = q_text.replace("\n", " ").replace("|", "\\|")
            q_guidance = q_guidance.replace("\n", " ").replace("|", "\\|")
            
            md_content += f"| **{q_code}** | {q_text} | {q_cat} | {q_level} | {q_guidance} |\n"
            
        md_content += f"""
---

## 🛠️ Verification & Implementation Guidelines

To implement the **{fw_name}** controls successfully inside your OT environment:

1. **Logical Separation**: Isolate all Level 1 and 2 process loops (PLCs/RTUs) from business segments using strict Level 3.5 DMZ routing tables.
2. **Access Control**: Ensure that all administrative commands to control loops require multi-factor authentication (MFA) via Jump Hosts.
3. **Continuous Auditing**: Collect and route event logs continuously to a write-once secure syslog receiver with synchronized NTP timestamps.
4. **Logic Backups**: Back up all running PLC configurations and logic programs weekly, storing them in fireproof cabinets or secure offsite enclaves.

> [!IMPORTANT]
> Any modifications to logic settings or firmware on Level 1-2 devices must undergo rigorous sandbox testing and double-signature verification before deployment.
"""
        
        output_file = os.path.join(output_dir, f"{fw_id}.md")
        with open(output_file, "w", encoding="utf-8") as f_out:
            f_out.write(md_content.strip() + "\n")
        count += 1
        
    print(f"Successfully generated {count} markdown blueprint files in {output_dir}.")

if __name__ == "__main__":
    main()
