#!/usr/bin/env python3
import json
import os


def main():
    catalog_path = "scripts/cset_catalog.json"
    frameworks_def_path = "scripts/generate_cset_library.py"
    
    # Target directories
    json_output_dir = "data/blueprints"
    md_output_dir = "docs/blueprints"
    brain_md_output_dir = "/Users/jimmcknney/.gemini/antigravity/brain/2f80812e-cb61-40b0-85b7-f853c7b024e2/blueprints"
    
    os.makedirs(json_output_dir, exist_ok=True)
    os.makedirs(md_output_dir, exist_ok=True)
    os.makedirs(brain_md_output_dir, exist_ok=True)
    
    # 1. Load the dynamic JSON catalog data
    if not os.path.exists(catalog_path):
        print(f"Error: {catalog_path} not found.")
        return
        
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    # 2. Extract framework metadata from generate_cset_library.py
    frameworks_metadata = {}
    try:
        with open(frameworks_def_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        start_idx = -1
        for idx, line in enumerate(lines):
            if "FRAMEWORKS = [" in line:
                start_idx = idx
                break
                
        if start_idx != -1:
            content_lines = []
            brace_count = 0
            for idx in range(start_idx, len(lines)):
                line = lines[idx]
                content_lines.append(line)
                brace_count += line.count("[") - line.count("]")
                if idx > start_idx and brace_count == 0:
                    break
            
            fw_code = "".join(content_lines)
            namespace = {}
            exec(fw_code, namespace)
            frameworks = namespace.get("FRAMEWORKS", [])
            for fw in frameworks:
                frameworks_metadata[fw["id"]] = fw
    except Exception as e:
        print(f"Warning: Failed to extract metadata programmatically: {e}.")
        
    # 3. Generate individual JSON & Markdown files for each framework
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
        fw_sectors = metadata.get("sectors") or [fw_sector]
        
        # Structure the framework details
        fw_data = {
            "id": fw_id,
            "name": fw_name,
            "fullName": fw_fullname,
            "description": fw_desc,
            "category": fw_category,
            "sector": fw_sector,
            "sectors": fw_sectors,
            "questions": []
        }
        
        for q in questions:
            q_code = q[0]
            q_name = q[1]
            q_text = q[2]
            q_cat = q[3]
            q_level = q[4]
            q_guidance = q[5] if len(q) > 5 else f"Verify compliance against {fw_name} requirement {q_code}."
            
            fw_data["questions"].append({
                "id": f"question:{fw_id}_{q_code.replace(' ', '_').replace('.', '_').replace('-', '_')}",
                "standardCode": q_code,
                "name": q_name,
                "text": q_text,
                "category": q_cat,
                "purdueLevel": q_level,
                "description": q_guidance
            })
            
        # Write individual JSON file
        json_file_path = os.path.join(json_output_dir, f"{fw_id}.json")
        with open(json_file_path, "w", encoding="utf-8") as f_json:
            json.dump(fw_data, f_json, indent=2, ensure_ascii=False)
            
        # Write individual Markdown file
        md_content = f"""# 📘 Compliance Record of Note: {fw_name}
## {fw_fullname}

---

## 📋 Framework Overview
* **Framework ID**: `{fw_id}`
* **Category**: `{fw_category}`
* **Industry Sector (Primary)**: `{fw_sector}`
* **Mapped CISA Critical Sectors**: {", ".join([f"`{s}`" for s in fw_sectors])}
* **Control Scope**: Contains {len(fw_data["questions"])} high-fidelity operational technology (OT) and information technology (IT) compliance checks.

> [!NOTE]
> This document serves as the official **Record of Note** and artifact for the {fw_name} framework. All control questions, standard codes, and Purdue Model mappings are compiled directly from CSET definitions.

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

| Standard Code | Question Text | Category | Purdue Level | Guidance / Description |
| :--- | :--- | :--- | :---: | :--- |
"""
        for q in fw_data["questions"]:
            q_code = q["standardCode"]
            q_text = q["text"].replace("\n", " ").replace("|", "\\|")
            q_cat = q["category"]
            q_level = q["purdueLevel"]
            q_guidance = q["description"].replace("\n", " ").replace("|", "\\|")
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
        
        # Write to project docs
        md_file_path = os.path.join(md_output_dir, f"{fw_id}.md")
        with open(md_file_path, "w", encoding="utf-8") as f_md:
            f_md.write(md_content.strip() + "\n")
            
        # Write to Brain Artifacts directory
        brain_md_file_path = os.path.join(brain_md_output_dir, f"{fw_id}.md")
        with open(brain_md_file_path, "w", encoding="utf-8") as f_brain:
            f_brain.write(md_content.strip() + "\n")
            
        count += 1
        
    print(f"Successfully generated {count} individual JSON and MD framework artifacts.")

if __name__ == "__main__":
    main()
