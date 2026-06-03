import asyncio
import datetime
import hashlib
import json
import os
import sys
import urllib.request

from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in path so we can import open_notebook
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query


def compute_checksum(record):
    # Exclude metadata fields and database ID
    cleaned = {k: v for k, v in record.items() if k not in ("_ingested_at", "_source_file", "_checksum", "id")}
    serialized = json.dumps(cleaned, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

def validate_regulation(reg):
    errors = []
    # Check id
    reg_id = reg.get("id")
    if not reg_id or not isinstance(reg_id, str) or not reg_id.strip() or not reg_id.startswith("regulation:"):
        errors.append("Invalid or empty ID")
        
    for field in ["name", "fullName", "description", "category", "sector"]:
        val = reg.get(field)
        if not val or not isinstance(val, str) or not val.strip():
            errors.append(f"Field {field} must be a non-empty string")
            
    # sectors
    sec_list = reg.get("sectors")
    if not isinstance(sec_list, list) or not sec_list:
        errors.append("sectors must be a non-empty list of strings")
    else:
        for idx, sec in enumerate(sec_list):
            if not sec or not isinstance(sec, str) or not sec.strip():
                errors.append(f"sectors element at index {idx} must be a non-empty string")

    # maturityLevels
    ml = reg.get("maturityLevels")
    if not isinstance(ml, list) or not ml:
        errors.append("maturityLevels must be a non-empty list")
    else:
        for idx, lvl in enumerate(ml):
            if not lvl or not isinstance(lvl, str) or not lvl.strip():
                errors.append(f"maturityLevels element at index {idx} must be a non-empty string")
                
    if errors:
        raise ValueError(f"Regulation validation failed: {'; '.join(errors)}")
    return True

def validate_question(q):
    errors = []
    # Check id
    q_id = q.get("id")
    if not q_id or not isinstance(q_id, str) or not q_id.strip() or not q_id.startswith("question:"):
        errors.append("Invalid or empty ID")
        
    reg_id = q.get("regulation_id")
    if not reg_id or not isinstance(reg_id, str) or not reg_id.strip() or not reg_id.startswith("regulation:"):
        errors.append("Invalid or empty regulation_id")
        
    for field in ["standard_code", "question_text", "description", "category"]:
        val = q.get(field)
        if not val or not isinstance(val, str) or not val.strip():
            errors.append(f"Field {field} must be a non-empty string")
            
    purdue = q.get("purdue_level")
    try:
        if purdue is None:
            raise ValueError("Purdue level is missing")
        purdue_val = int(purdue)
        if purdue_val < 1 or purdue_val > 5:
            errors.append(f"purdue_level {purdue} is out of bounds [1-5]")
    except (ValueError, TypeError):
        errors.append(f"purdue_level must be an integer between 1 and 5 (got {purdue})")
        
    if errors:
        raise ValueError(f"Question validation failed: {'; '.join(errors)}")
    return True

def write_to_dlq(record, record_type, error_msg):
    dlq_path = "/Users/jimmcknney/notebook_tetrel/data/dlq_failed_records.json"
    os.makedirs(os.path.dirname(dlq_path), exist_ok=True)
    
    dlq_record = {
        "failed_at": datetime.datetime.utcnow().isoformat() + "Z",
        "record_type": record_type,
        "error_message": str(error_msg),
        "record": record
    }
    
    existing = []
    if os.path.exists(dlq_path):
        try:
            with open(dlq_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    existing = json.loads(content)
                    if not isinstance(existing, list):
                        existing = [existing]
        except Exception as e:
            print(f"Error reading existing DLQ file: {e}")
            existing = []
            
    existing.append(dlq_record)
    
    try:
        with open(dlq_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        print(f"Saved failed {record_type} to DLQ: {dlq_path}")
    except Exception as e:
        print(f"Error writing to DLQ file: {e}")

async def repo_query_with_retry(query, vars=None, max_retries=5, base_delay=0.5, backoff_factor=2.0):
    last_err = None
    for attempt in range(max_retries):
        try:
            return await repo_query(query, vars)
        except Exception as e:
            last_err = e
            delay = base_delay * (backoff_factor ** attempt)
            print(f"Database query failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)
    print(f"Database query failed after {max_retries} attempts.")
    raise last_err

# CSET Caching maps for parsed SQL data
CSET_SETS = {}
CSET_REQUIREMENTS = {}
CSET_REQ_SETS = {}
CSET_QUESTIONS = {}
CSET_Q_SETS = {}
CSET_MATURITY_MODELS = {}
CSET_MATURITY_LEVELS = {}
CSET_MATURITY_QUESTIONS = {}

def parse_sql_values(vals_part):
    vals_part = vals_part.strip()
    if vals_part.startswith("("):
        vals_part = vals_part[1:]
    if vals_part.endswith(")") or vals_part.endswith(");"):
        vals_part = vals_part.rstrip(");")
    
    vals = []
    i = 0
    n = len(vals_part)
    current_val = []
    in_quotes = False
    
    while i < n:
        char = vals_part[i]
        if in_quotes:
            if char == "'":
                if i + 1 < n and vals_part[i+1] == "'":
                    current_val.append("'")
                    i += 2
                    continue
                else:
                    in_quotes = False
                    i += 1
                    continue
            else:
                current_val.append(char)
                i += 1
        else:
            if char == "'" or (char == "N" and i + 1 < n and vals_part[i+1] == "'"):
                in_quotes = True
                if char == "'":
                    i += 1
                else:
                    i += 2
                continue
            elif char == ",":
                vals.append("".join(current_val).strip())
                current_val = []
                i += 1
            else:
                current_val.append(char)
                i += 1
                
    vals.append("".join(current_val).strip())
    
    cleaned_vals = []
    for v in vals:
        v_upper = v.upper()
        if v_upper == "NULL" or v == "":
            cleaned_vals.append(None)
        elif (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
            cleaned_vals.append(v[1:-1])
        else:
            cleaned_vals.append(v)
            
    return cleaned_vals

def extract_insert_columns_and_values(line):
    line_upper = line.upper()
    if "INSERT INTO" not in line_upper or "VALUES" not in line_upper:
        return None, None
    
    try:
        parts = line.split("VALUES")
        if len(parts) < 2:
            return None, None
        
        insert_part = parts[0]
        vals_part = "VALUES".join(parts[1:])
        
        table_match = [t.strip("[] ") for t in insert_part.split("INTO")[1].split("(")[0].split(".")]
        table_name = table_match[-1]
        
        cols = []
        if "(" in insert_part:
            cols_part = insert_part.split("(")[1].split(")")[0]
            cols = [c.strip("[] ") for c in cols_part.split(",")]
            
        vals = parse_sql_values(vals_part)
        
        if cols and len(cols) == len(vals):
            return table_name, dict(zip(cols, vals))
        else:
            return table_name, vals
    except Exception as e:
        return None, None

def run_global_cset_parser():
    cset_dir = os.environ.get("CSET_DIR", "/Users/jimmcknney/cset_clone")
    print(f"Initiating global CSET schema parse from: {cset_dir}...")
    sql_files_count = 0
    
    for root, dirs, files in os.walk(cset_dir):
        if ".git" in root or "bin" in root or "obj" in root:
            continue
        for f in files:
            if not f.endswith(".sql"):
                continue
            path = os.path.join(root, f)
            sql_files_count += 1
            
            try:
                with open(path, "r", encoding="utf-16le") as fh:
                    lines = fh.readlines()
            except Exception:
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                        lines = fh.readlines()
                except Exception:
                    continue
            
            for line in lines:
                if "INSERT INTO" not in line and "insert into" not in line:
                    continue
                
                table_name, parsed = extract_insert_columns_and_values(line)
                if not table_name or not parsed or not isinstance(parsed, dict):
                    continue
                
                if table_name == "SETS":
                    set_name = parsed.get("Set_Name")
                    full_name = parsed.get("Full_Name") or parsed.get("Short_Name")
                    if set_name and full_name:
                        CSET_SETS[set_name] = full_name
                        
                elif table_name == "REQUIREMENT_SETS":
                    req_id = parsed.get("Requirement_Id")
                    set_name = parsed.get("Set_Name")
                    if req_id and set_name:
                        if set_name not in CSET_REQ_SETS:
                            CSET_REQ_SETS[set_name] = []
                        CSET_REQ_SETS[set_name].append(req_id)
                        
                elif table_name == "NEW_REQUIREMENT":
                    req_id = parsed.get("Requirement_Id")
                    title = parsed.get("Requirement_Title")
                    text = parsed.get("Requirement_Text")
                    category = parsed.get("Category") or "Control"
                    subcat = parsed.get("Sub_Category") or ""
                    if req_id:
                        CSET_REQUIREMENTS[req_id] = {
                            "id": req_id,
                            "title": title,
                            "text": text,
                            "category": category,
                            "subcat": subcat,
                            "_source_file": path
                        }
                        
                elif table_name == "NEW_QUESTION_SETS":
                    q_id = parsed.get("Question_Id")
                    set_name = parsed.get("Set_Name")
                    if q_id and set_name:
                        if set_name not in CSET_Q_SETS:
                            CSET_Q_SETS[set_name] = []
                        CSET_Q_SETS[set_name].append(q_id)
                        
                elif table_name == "NEW_QUESTION":
                    q_id = parsed.get("Question_Id")
                    std_code = parsed.get("Std_Ref")
                    text = parsed.get("Question_Text")
                    category = parsed.get("Category") or "Control"
                    if q_id:
                        CSET_QUESTIONS[q_id] = {
                            "id": q_id,
                            "std_code": std_code,
                            "text": text,
                            "category": category,
                            "_source_file": path
                        }
                        
                elif table_name == "MATURITY_MODELS":
                    model_id = parsed.get("Maturity_Model_Id")
                    model_name = parsed.get("Model_Name")
                    model_title = parsed.get("Model_Title") or model_name
                    if model_id:
                        CSET_MATURITY_MODELS[str(model_id)] = {
                            "name": model_name,
                            "title": model_title
                        }
                        
                elif table_name == "MATURITY_LEVELS":
                    lvl_id = parsed.get("Maturity_Level_Id")
                    lvl_name = parsed.get("Level_Name")
                    if lvl_id and lvl_name:
                        CSET_MATURITY_LEVELS[str(lvl_id)] = lvl_name
                        
                elif table_name == "MATURITY_QUESTIONS":
                    q_id = parsed.get("Mat_Question_Id")
                    title = parsed.get("Question_Title")
                    text = parsed.get("Question_Text")
                    supp = parsed.get("Supplemental_Info") or ""
                    cat = parsed.get("Category") or "General"
                    lvl_id = parsed.get("Maturity_Level_Id")
                    model_id = parsed.get("Maturity_Model_Id")
                    if q_id and model_id:
                        CSET_MATURITY_QUESTIONS[str(q_id)] = {
                            "id": q_id,
                            "title": title,
                            "text": text,
                            "description": supp,
                            "category": cat,
                            "level_id": str(lvl_id) if lvl_id else None,
                            "model_id": str(model_id),
                            "_source_file": path
                        }
    
    print(f"Parsed {sql_files_count} SQL files. CSET data successfully indexed in memory.")

def get_cset_parsed_questions(fw):
    fw_id = fw["id"]
    fw_name = fw["name"]
    
    # Mappings from local framework IDs to CSET standards or maturity models
    cset_set_mapping = {
        "NIST_800_53": "C800_53_R5_V2",
        "AWWA_G430": "AWWA",
        "NIST_800_82": "SP800-82 V3",
    }
    
    cset_mm_mapping = {
        "CISA_CPG": ("21", None),      # Model 21 (CPG2)
        "CMMC_L1": ("6", "14"),        # Model 6 (CMMC2), Level 1 (ID 14)
        "CMMC_L2": ("6", "15"),        # Model 6 (CMMC2), Level 2 (ID 15)
        "CMMC_L3": ("2", "3"),          # Model 2 (CMMC 1.0), Level 3 (ID 3)
        "TSA_PIPELINE": ("14", None),   # Model 14 (Security Directive Pipeline)
    }
    
    mm_id, mm_lvl = cset_mm_mapping.get(fw_id, (None, None))
    
    # 1. Fetch from MATURITY QUESTIONS if mm_id mapped
    if mm_id and mm_id in CSET_MATURITY_MODELS:
        parsed_qs = []
        for q_id, q in CSET_MATURITY_QUESTIONS.items():
            if q["model_id"] == mm_id:
                if mm_lvl and q["level_id"] != mm_lvl:
                    continue
                
                std_code = q["title"] or f"Q-{q['id']}"
                purdue_level = get_purdue_level_by_family(q["category"])
                
                parsed_qs.append({
                    "id": f"question:{fw_id}_{str(q['id'])}",
                    "regulation_id": f"regulation:{fw_id}",
                    "standard_code": std_code,
                    "question_text": q["text"],
                    "description": q["description"] or q["text"],
                    "purdue_level": purdue_level,
                    "category": q["category"] or "General",
                    "_source_file": q.get("_source_file") or "CSET maturity model SQL"
                })
        if parsed_qs:
            print(f"Mapped {fw_id} to Maturity Model {mm_id} -> Extracted {len(parsed_qs)} questions from CSET.")
            return parsed_qs
            
    # 2. Fetch from SETS (standard checklist) if set mapped
    set_name = cset_set_mapping.get(fw_id)
    if not set_name:
        for k in CSET_SETS.keys():
            if k.upper() == fw_id.upper() or k.upper().replace("_", "") == fw_id.upper().replace("_", ""):
                set_name = k
                break
                
    if set_name and (set_name in CSET_Q_SETS or set_name in CSET_REQ_SETS):
        parsed_qs = []
        
        # A. Use NEW_QUESTION if available
        if set_name in CSET_Q_SETS and CSET_Q_SETS[set_name]:
            for q_id in CSET_Q_SETS[set_name]:
                q = CSET_QUESTIONS.get(q_id)
                if not q:
                    continue
                std_code = q["std_code"] or f"Q-{q['id']}"
                purdue_level = get_purdue_level_by_family(q["category"])
                
                parsed_qs.append({
                    "id": f"question:{fw_id}_{str(q['id'])}",
                    "regulation_id": f"regulation:{fw_id}",
                    "standard_code": std_code,
                    "question_text": q["text"],
                    "description": q["text"],
                    "purdue_level": purdue_level,
                    "category": q["category"] or "General",
                    "_source_file": q.get("_source_file") or "CSET standard SQL"
                })
        # B. Use NEW_REQUIREMENT if questions not available
        elif set_name in CSET_REQ_SETS and CSET_REQ_SETS[set_name]:
            for req_id in CSET_REQ_SETS[set_name]:
                req = CSET_REQUIREMENTS.get(req_id)
                if not req:
                    continue
                std_code = req["title"] or f"R-{req['id']}"
                purdue_level = get_purdue_level_by_family(req["category"])
                
                parsed_qs.append({
                    "id": f"question:{fw_id}_{str(req['id'])}",
                    "regulation_id": f"regulation:{fw_id}",
                    "standard_code": std_code,
                    "question_text": req["text"],
                    "description": req["text"],
                    "purdue_level": purdue_level,
                    "category": req["category"] or "General",
                    "_source_file": req.get("_source_file") or "CSET requirement SQL"
                })
                
        if parsed_qs:
            print(f"Mapped {fw_id} to standard set {set_name} -> Extracted {len(parsed_qs)} questions from CSET.")
            return parsed_qs
            
    return []

# List of all 63 CSET compliance frameworks
FRAMEWORKS = [
    # 1-10: Cross-Sector Core Standards
    {
        "id": "IEC_62443_3_3",
        "name": "IEC 62443-3-3",
        "fullName": "Industrial Communication Networks - System Security Requirements",
        "description": "Defines security capabilities for industrial automation and control systems (IACS) including zone and conduit protection.",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems", "Dams", "Nuclear Reactors, Materials, and Waste"],
        "questionCount": 14,
        "maturityLevels": ["SL-1", "SL-2", "SL-3", "SL-4"]
    },
    {
        "id": "IEC_62443_4_2",
        "name": "IEC 62443-4-2",
        "fullName": "Technical Security Requirements for IACS Components",
        "description": "Sets concrete security capabilities and rules for host, network, software application, and embedded system devices.",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems", "Nuclear Reactors, Materials, and Waste"],
        "questionCount": 10,
        "maturityLevels": ["SL-1", "SL-2", "SL-3", "SL-4"]
    },
    {
        "id": "IEC_62443_2_1",
        "name": "IEC 62443-2-1",
        "fullName": "Establishing an IACS Security Program",
        "description": "Requirements for establishing, implementing, maintaining, and improving a security program for asset owners.",
        "category": "Governance & Policy",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Core Control"]
    },
    {
        "id": "IEC_62443_2_4",
        "name": "IEC 62443-2-4",
        "fullName": "Security Program Requirements for Service Providers",
        "description": "Specifies capabilities for IACS service providers, system integrators, and maintenance vendors.",
        "category": "Vendor Risk",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Core Control"]
    },
    {
        "id": "IEC_62443_4_1",
        "name": "IEC 62443-4-1",
        "fullName": "Secure Product Development Lifecycle Requirements",
        "description": "Governs product developers on threat modeling, secure design, coding standards, and vulnerability handling.",
        "category": "Secure Development",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical", "Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Core Control"]
    },
    {
        "id": "NIST_800_82",
        "name": "NIST SP 800-82 r3",
        "fullName": "Guide to Industrial Control Systems (ICS) Security",
        "description": "Comprehensive guidance on securing SCADA, distributed control systems, and PLCs in critical infrastructures.",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Energy", "Water and Wastewater Systems", "Critical Manufacturing", "Chemical", "Dams", "Nuclear Reactors, Materials, and Waste", "Transportation Systems"],
        "questionCount": 5,
        "maturityLevels": ["Low", "Moderate", "High"]
    },
    {
        "id": "NIST_800_53",
        "name": "NIST SP 800-53 r5",
        "fullName": "Security and Privacy Controls for Federal Information Systems",
        "description": "Catalog of standard security controls designed for federal information systems, cataloged across 20 domains.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Government Facilities", "Defense Industrial Base", "Healthcare and Public Health", "Financial Services"],
        "questionCount": 324,
        "maturityLevels": ["Low", "Moderate", "High"]
    },
    {
        "id": "NIST_CSF",
        "name": "NIST CSF v2.0",
        "fullName": "NIST Cybersecurity Framework",
        "description": "Framework designed to reduce cybersecurity risk through six core functions: Govern, Identify, Protect, Detect, Respond, Recover.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Financial Services", "Energy", "Healthcare and Public Health", "Commercial Facilities", "Government Facilities", "Communications"],
        "questionCount": 10,
        "maturityLevels": ["Tier 1", "Tier 2", "Tier 3", "Tier 4"]
    },
    {
        "id": "CISA_CPG",
        "name": "CISA Cross-Sector CPGs",
        "fullName": "CISA Cross-Sector Cyber Performance Goals v1.0.1",
        "description": "Baseline goals derived from existing frameworks, prioritizing IT and OT actions to secure operations.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Energy", "Water and Wastewater Systems", "Healthcare and Public Health", "Transportation Systems", "Emergency Services"],
        "questionCount": 10,
        "maturityLevels": ["Baseline"]
    },
    {
        "id": "CIS_CONTROLS",
        "name": "CIS Controls v8",
        "fullName": "CIS Top 18 Critical Security Controls",
        "description": "Prioritized set of actions protecting enterprise IT and endpoint devices from modern cyber threats.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Commercial Facilities", "Government Facilities", "Financial Services"],
        "questionCount": 18,
        "maturityLevels": ["IG1", "IG2", "IG3"]
    },
    # 11-20: Energy & Electric Grid Sector
    {
        "id": "NERC_CIP_002",
        "name": "NERC CIP-002-5.1a",
        "fullName": "BES Cyber System Categorization",
        "description": "Mandatory standard to identify and categorize Bulk Electric System (BES) cyber systems into Impact levels.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Low Impact", "Medium Impact", "High Impact"]
    },
    {
        "id": "NERC_CIP_003",
        "name": "NERC CIP-003-8",
        "fullName": "Security Management Controls",
        "description": "Requires documented, approved cybersecurity policies and designated leadership for energy systems.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Management"]
    },
    {
        "id": "NERC_CIP_004",
        "name": "NERC CIP-004-6",
        "fullName": "Personnel & Training",
        "description": "Governs background checks, security awareness, and authorization requirements for personnel with system access.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Compliance"]
    },
    {
        "id": "NERC_CIP_005",
        "name": "NERC CIP-005-7",
        "fullName": "Electronic Security Perimeters",
        "description": "Requires strict Electronic Security Perimeters (ESP) surrounding energy cyber systems and mediates external links.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["ESP Boundary"]
    },
    {
        "id": "NERC_CIP_006",
        "name": "NERC CIP-006-6",
        "fullName": "Physical Security of BES Cyber Assets",
        "description": "Requires physical security plans and access control gates surrounding critical electric substation facilities.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Physical Gate"]
    },
    {
        "id": "NERC_CIP_007",
        "name": "NERC CIP-007-6",
        "fullName": "System Security Management",
        "description": "Mandates technical controls spanning port lockdown, patch management, and security event logging.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Control"]
    },
    {
        "id": "NERC_CIP_008",
        "name": "NERC CIP-008-6",
        "fullName": "Incident Reporting and Response Planning",
        "description": "Establishes requirements to identify, classify, respond, and report critical grid cybersecurity incidents.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Response"]
    },
    {
        "id": "NERC_CIP_009",
        "name": "NERC CIP-009-6",
        "fullName": "Recovery Plans for BES Cyber Systems",
        "description": "Requires disaster recovery plans, backup strategies, and annual simulation tests for substation systems.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Recovery"]
    },
    {
        "id": "NERC_CIP_010",
        "name": "NERC CIP-010-4",
        "fullName": "Configuration Change Management & Vulnerability Assessments",
        "description": "Enforces baseline configuration tracking, change verification, and regular active vulnerability assessments.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Assessment"]
    },
    {
        "id": "NERC_CIP_011",
        "name": "NERC CIP-011-2",
        "fullName": "Information Protection",
        "description": "Requirements to protect and securely sanitize Bulk Electric System operational cyber information.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Sanitization"]
    },
    # 21-30: Additional Energy, Pipeline & Nuclear Standards
    {
        "id": "NERC_CIP_013",
        "name": "NERC CIP-013-1",
        "fullName": "Supply Chain Risk Management",
        "description": "Mandatory standard to assess and mitigate cybersecurity supply chain risks associated with grid hardware procurement.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy", "Critical Manufacturing"],
        "questionCount": 10,
        "maturityLevels": ["Supply Chain"]
    },
    {
        "id": "NERC_CIP_014",
        "name": "NERC CIP-014-3",
        "fullName": "Physical Security for Transmission Substations",
        "description": "Requires transmission operators to perform threat risk assessments and secure critical physical assets.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Transmission"]
    },
    {
        "id": "ISO_27019",
        "name": "ISO/IEC 27019:2017",
        "fullName": "Information Security Controls for the Energy Utility Industry",
        "description": "Energy-sector specific ISO guidelines directing secure controls for electric, gas, and water networks.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 12,
        "maturityLevels": ["Utility Level"]
    },
    {
        "id": "NISTIR_7628",
        "name": "NISTIR 7628 r1",
        "fullName": "Guidelines for Smart Grid Cyber Security",
        "description": "Three-volume technical guideline establishing robust security requirements for smart grid facilities.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["High", "Medium", "Low"]
    },
    {
        "id": "INGAA_GUIDE",
        "name": "INGAA Guidelines",
        "fullName": "Control Systems Cyber Security Guidelines for Natural Gas Pipelines",
        "description": "Industry standards for securing interstate natural gas compressor stations and SCADA links.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy", "Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Compressor"]
    },
    {
        "id": "API_1164",
        "name": "API Standard 1164",
        "fullName": "Pipeline SCADA Security Standard",
        "description": "American Petroleum Institute standard directing robust security for liquid and gas pipeline networks.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy", "Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["SCADA Level"]
    },
    {
        "id": "FERC_889",
        "name": "FERC Order 889",
        "fullName": "Open Access Same-Time Information System",
        "description": "Federal Energy Regulatory Commission guidelines on information sharing and electric transmission interfaces.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy"],
        "questionCount": 10,
        "maturityLevels": ["Standard"]
    },
    {
        "id": "IEEE_1686",
        "name": "IEEE 1686-2022",
        "fullName": "Standard for Intelligent Electronic Devices - IEDs Cyber Security",
        "description": "Specifies access control, auditing, and cryptographic features for electrical substation electronic devices.",
        "category": "Energy & Utilities",
        "sector": "Energy",
        "sectors": ["Energy", "Critical Manufacturing"],
        "questionCount": 10,
        "maturityLevels": ["IED Level"]
    },
    {
        "id": "NRC_RG_5_71",
        "name": "NRC Regulatory Guide 5.71",
        "fullName": "Cyber Security Programs for Nuclear Facilities",
        "description": "Strict nuclear regulatory commission framework to prevent radiological sabotage via digital systems.",
        "category": "Nuclear Operations",
        "sector": "Nuclear Reactors, Materials, and Waste",
        "sectors": ["Nuclear Reactors, Materials, and Waste", "Energy"],
        "questionCount": 10,
        "maturityLevels": ["Nuclear Standard"]
    },
    {
        "id": "IAEA_NSS_17",
        "name": "IAEA NSS-17-G",
        "fullName": "Technical Guidance for Computer Security at Nuclear Facilities",
        "description": "Global IAEA recommendations establishing computer security plans for nuclear material holding systems.",
        "category": "Nuclear Operations",
        "sector": "Nuclear Reactors, Materials, and Waste",
        "sectors": ["Nuclear Reactors, Materials, and Waste", "Energy"],
        "questionCount": 10,
        "maturityLevels": ["IAEA Standard"]
    },
    # 31-33: Water & Wastewater Sector
    {
        "id": "AWWA_G430",
        "name": "AWWA G430-22",
        "fullName": "Water and Wastewater Utility Security Practices",
        "description": "Security and preparedness standards specifically designed for water treatment plant infrastructure operations.",
        "category": "Water & Wastewater",
        "sector": "Water and Wastewater Systems",
        "sectors": ["Water and Wastewater Systems", "Healthcare and Public Health"],
        "questionCount": 10,
        "maturityLevels": ["Standard"]
    },
    {
        "id": "EPA_WATER",
        "name": "EPA Cybersecurity Baseline",
        "fullName": "Cybersecurity Baseline for Public Water Systems",
        "description": "EPA requirements protecting critical operations and PLCs in drinking water treatment facilities.",
        "category": "Water & Wastewater",
        "sector": "Water and Wastewater Systems",
        "sectors": ["Water and Wastewater Systems", "Healthcare and Public Health"],
        "questionCount": 10,
        "maturityLevels": ["Baseline"]
    },
    {
        "id": "AWWA_M19",
        "name": "AWWA M19 Emergency Planning",
        "fullName": "Emergency Planning for Water and Wastewater Utilities",
        "description": "Manual of water supply practices outlining physical and cybersecurity risk mitigation strategies.",
        "category": "Water & Wastewater",
        "sector": "Water and Wastewater Systems",
        "sectors": ["Water and Wastewater Systems", "Emergency Services"],
        "questionCount": 10,
        "maturityLevels": ["Resiliency"]
    },
    # 34-40: Defense & Aerospace
    {
        "id": "NIST_800_171",
        "name": "NIST SP 800-171 r3",
        "fullName": "Protecting Controlled Unclassified Information in Nonfederal Systems",
        "description": "Cybersecurity requirements for protecting sensitive defense-related data stored on nonfederal information systems.",
        "category": "Defense & Aerospace",
        "sector": "Defense Industrial Base",
        "sectors": ["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"],
        "questionCount": 12,
        "maturityLevels": ["Basic", "Derived"]
    },
    {
        "id": "NIST_800_172",
        "name": "NIST SP 800-172",
        "fullName": "Enhanced Security Requirements for Controlled Unclassified Information",
        "description": "Advanced security practices engineered to stop Advanced Persistent Threats (APTs) targeting high-value defense data.",
        "category": "Defense & Aerospace",
        "sector": "Defense Industrial Base",
        "sectors": ["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"],
        "questionCount": 10,
        "maturityLevels": ["Enhanced"]
    },
    {
        "id": "CMMC_L1",
        "name": "CMMC 2.0 Level 1",
        "fullName": "Cybersecurity Maturity Model Certification - Foundational",
        "description": "Basic cyber hygiene requirements protecting federal contract information across 17 distinct controls.",
        "category": "Defense & Aerospace",
        "sector": "Defense Industrial Base",
        "sectors": ["Defense Industrial Base", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Level 1 (Foundational)"]
    },
    {
        "id": "CMMC_L2",
        "name": "CMMC 2.0 Level 2",
        "fullName": "Cybersecurity Maturity Model Certification - Advanced",
        "description": "Aligns fully with NIST SP 800-171, introducing 110 controls for companies handling CUI data.",
        "category": "Defense & Aerospace",
        "sector": "Defense Industrial Base",
        "sectors": ["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"],
        "questionCount": 12,
        "maturityLevels": ["Level 2 (Advanced)"]
    },
    {
        "id": "CMMC_L3",
        "name": "CMMC 2.0 Level 3",
        "fullName": "Cybersecurity Maturity Model Certification - Expert",
        "description": "Advanced security controls based on NIST 800-172, protecting high-value target assets from persistent threats.",
        "category": "Defense & Aerospace",
        "sector": "Defense Industrial Base",
        "sectors": ["Defense Industrial Base", "Government Facilities", "Critical Manufacturing"],
        "questionCount": 10,
        "maturityLevels": ["Level 3 (Expert)"]
    },
    {
        "id": "CNSSI_1253",
        "name": "CNSSI 1253",
        "fullName": "Security Categorization for National Security Systems",
        "description": "Instructions on categorizing government national security databases and applying tailored overlays.",
        "category": "Defense & Aerospace",
        "sector": "Defense Industrial Base",
        "sectors": ["Defense Industrial Base", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["High Impact"]
    },
    {
        "id": "NNSA_NAP_24",
        "name": "NNSA NAP-24A",
        "fullName": "Weapons Program Information Security Requirements",
        "description": "U.S. National Nuclear Security Administration standards governing defense nuclear facilities.",
        "category": "Defense & Aerospace",
        "sector": "Nuclear Reactors, Materials, and Waste",
        "sectors": ["Nuclear Reactors, Materials, and Waste", "Defense Industrial Base", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Defense Nuclear"]
    },
    # 41-50: Transportation Sector
    {
        "id": "TSA_PIPELINE",
        "name": "TSA Pipeline Directive 2C",
        "fullName": "TSA Pipeline Cybersecurity Directives",
        "description": "Mandatory directives focusing on security segmentation, access controls, and boundary mitigation for pipeline operators.",
        "category": "Transportation",
        "sector": "Transportation Systems",
        "sectors": ["Transportation Systems", "Energy"],
        "questionCount": 10,
        "maturityLevels": ["Section 1", "Section 2"]
    },
    {
        "id": "TSA_RAIL",
        "name": "TSA Rail Directive 01",
        "fullName": "TSA Cybersecurity Directive for Passenger and Freight Rail",
        "description": "TSA cybersecurity regulations for passenger and freight rail systems to prevent system disruption.",
        "category": "Transportation",
        "sector": "Transportation Systems",
        "sectors": ["Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Operational"]
    },
    {
        "id": "FAA_AIRPORT",
        "name": "FAA Airport Cyber Security",
        "fullName": "FAA Guidelines for Airport Operations and Traffic Systems",
        "description": "Cybersecurity standards designed to protect airport networks, ground control, and navigation radars.",
        "category": "Transportation",
        "sector": "Transportation Systems",
        "sectors": ["Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Aviation"]
    },
    {
        "id": "USCG_MARITIME",
        "name": "USCG Maritime Cyber Security",
        "fullName": "US Coast Guard Cybersecurity Standards for Marine Facilities",
        "description": "Regulations mandating maritime facilities to document, mitigate, and report ship-to-shore network risks.",
        "category": "Transportation",
        "sector": "Transportation Systems",
        "sectors": ["Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Maritime"]
    },
    {
        "id": "DO_326A",
        "name": "DO-326A",
        "fullName": "Airworthiness Security Process Specification",
        "description": "Aviation security specification designed to protect aircraft digital control buses and avionics links.",
        "category": "Transportation",
        "sector": "Transportation Systems",
        "sectors": ["Transportation Systems", "Critical Manufacturing"],
        "questionCount": 10,
        "maturityLevels": ["Avionics"]
    },
    # 46: Chemical Sector
    {
        "id": "CFATS_RBPS",
        "name": "CFATS RBPS",
        "fullName": "Chemical Facility Anti-Terrorism Standards - Risk-Based Performance",
        "description": "Department of Homeland Security (DHS) risk-based performance goals protecting high-risk chemical facilities.",
        "category": "Chemical Operations",
        "sector": "Chemical",
        "sectors": ["Chemical", "Emergency Services"],
        "questionCount": 10,
        "maturityLevels": ["RBPS 1-18"]
    },
    {
        "id": "ANSSI_BP_006",
        "name": "ANSSI BP-006",
        "fullName": "French Security Guidelines for Industrial Control Systems",
        "description": "French national cybersecurity agency (ANSSI) guidelines establishing secure ICS network architectures.",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical"],
        "questionCount": 10,
        "maturityLevels": ["Class 1", "Class 2", "Class 3"]
    },
    {
        "id": "BSI_IT_GRUNDSCHUTZ",
        "name": "BSI IT-Grundschutz",
        "fullName": "German IT Baseline Protection Methodology",
        "description": "German BSI framework mapping detailed, structural security controls protecting enterprise networks.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Commercial Facilities", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Baseline"]
    },
    {
        "id": "DHS_CATALOG",
        "name": "DHS Catalog of Controls",
        "fullName": "DHS Catalog of Control Systems Security Recommendation",
        "description": "DHS compilation of security guidelines designed to secure legacy programmable logic controllers (PLCs).",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems", "Chemical"],
        "questionCount": 10,
        "maturityLevels": ["Core Control"]
    },
    {
        "id": "ISA_99_LEGACY",
        "name": "ISA-99",
        "fullName": "ISA-99 Standard",
        "description": "Legacy industrial network standard establishing basic zoning security concepts.",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Critical Manufacturing", "Energy", "Water and Wastewater Systems"],
        "questionCount": 10,
        "maturityLevels": ["Legacy Standard"]
    },
    # 51-63: IT/OT General, Cloud, and Financial Compliance
    {
        "id": "ISO_27001",
        "name": "ISO/IEC 27001:2022",
        "fullName": "Information Security Management System",
        "description": "International standard specifying the requirements for establishing, implementing, maintaining information security.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Financial Services", "Healthcare and Public Health"],
        "questionCount": 12,
        "maturityLevels": ["Core Control"]
    },
    {
        "id": "COBIT_2019",
        "name": "COBIT 2019",
        "fullName": "Information and Technology Governance Framework",
        "description": "ISACA corporate governance and IT management framework aligning technical operations with corporate business strategies.",
        "category": "Governance & Policy",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Financial Services", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Maturity 1-5"]
    },
    {
        "id": "HIPAA_SECURITY",
        "name": "HIPAA Security Rule",
        "fullName": "Health Insurance Portability and Accountability Act Standards",
        "description": "U.S. national standards protecting electronic protected health information (ePHI) across technical controls.",
        "category": "Health & Medical",
        "sector": "Healthcare and Public Health",
        "sectors": ["Healthcare and Public Health", "Information Technology"],
        "questionCount": 10,
        "maturityLevels": ["Administrative", "Physical", "Technical"]
    },
    {
        "id": "SOC_2",
        "name": "SOC 2 Type II",
        "fullName": "Trust Services Criteria - Security, Confidentiality, Availability",
        "description": "AICPA criteria confirming corporate systems protect data assets from unauthorized intrusions and downtime.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Financial Services", "Commercial Facilities"],
        "questionCount": 10,
        "maturityLevels": ["TSC Audited"]
    },
    {
        "id": "PCI_DSS",
        "name": "PCI-DSS v4.0",
        "fullName": "Payment Card Industry Data Security Standard",
        "description": "Global technical standard safeguarding payment gateway structures, processing links, and customer database logs.",
        "category": "Finance Operations",
        "sector": "Financial Services",
        "sectors": ["Financial Services", "Commercial Facilities"],
        "questionCount": 12,
        "maturityLevels": ["Level 1-4"]
    },
    {
        "id": "CSA_CCM",
        "name": "CSA Cloud Controls Matrix",
        "fullName": "Cloud Security Alliance Controls Framework",
        "description": "Specifies 197 cloud-specific security controls spanning 17 domains to evaluate cloud service providers.",
        "category": "Cloud Security",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Commercial Facilities", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Level 1-3"]
    },
    {
        "id": "ACSC_ESSENTIAL_8",
        "name": "ACSC Essential Eight",
        "fullName": "Australian Cyber Security Centre Mitigation Strategies",
        "description": "Prioritized mitigation strategies focused on preventing intrusions, limiting host impacts, and recovering data.",
        "category": "General IT/OT",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Government Facilities", "Defense Industrial Base"],
        "questionCount": 10,
        "maturityLevels": ["Level 1", "Level 2", "Level 3"]
    },
    {
        "id": "SWIFT_CSCF",
        "name": "SWIFT CSCF v2024",
        "fullName": "SWIFT Customer Security Controls Framework",
        "description": "Mandatory security baseline validating transaction network terminals and link endpoints.",
        "category": "Finance Operations",
        "sector": "Financial Services",
        "sectors": ["Financial Services"],
        "questionCount": 10,
        "maturityLevels": ["Mandatory", "Advisory"]
    },
    {
        "id": "CRI_PROFILE",
        "name": "CRI Profile v2.0",
        "fullName": "Cyber Risk Institute Unified Profile for Financial Sector",
        "description": "Unified financial sector cybersecurity assessment scaling across asset management and banking.",
        "category": "Finance Operations",
        "sector": "Financial Services",
        "sectors": ["Financial Services"],
        "questionCount": 10,
        "maturityLevels": ["Tier 1-4"]
    },
    {
        "id": "KATRI_SCADA",
        "name": "KATRI SCADA Framework",
        "fullName": "Korean Infrastructure SCADA Security Standard",
        "description": "Regulatory framework directing baseline protections for municipal SCADA networks and utility facilities.",
        "category": "Industrial Control Systems",
        "sector": "Cross-Sector",
        "sectors": ["Energy", "Water and Wastewater Systems", "Transportation Systems"],
        "questionCount": 10,
        "maturityLevels": ["Standard"]
    },
    {
        "id": "NIST_800_37",
        "name": "NIST SP 800-37 r2",
        "fullName": "Risk Management Framework - RMF Process Guide",
        "description": "Directs the seven-step authorization and continuous monitoring pipeline for critical state database systems.",
        "category": "Risk Management",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["RMF Step 1-7"]
    },
    {
        "id": "NIST_800_161",
        "name": "NIST SP 800-161 r1",
        "fullName": "Cybersecurity Supply Chain Risk Management (C-SCRM)",
        "description": "Technical frameworks for monitoring, managing, and resolving vulnerabilities inside external supplier links.",
        "category": "Supply Chain Security",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Critical Manufacturing", "Defense Industrial Base", "Government Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Basic", "Enhanced"]
    },
    {
        "id": "ENISA_IOT",
        "name": "ENISA IoT Security",
        "fullName": "ENISA Guidelines for Securing Internet of Things",
        "description": "European IoT security guidelines outlining robust configuration profiles for telemetry transceivers.",
        "category": "Cloud Security",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Commercial Facilities"],
        "questionCount": 10,
        "maturityLevels": ["Baseline"]
    },
    {
        "id": "NIS2",
        "name": "EU NIS2 Directive",
        "fullName": "Directive (EU) 2022/2555 on Cybersecurity Risk Management measures",
        "description": "European Union's mandatory directive establishing high-level risk management, governance, and reporting obligations for essential sectors.",
        "category": "Governance & Policy",
        "sector": "Cross-Sector",
        "sectors": ["Energy", "Transportation Systems", "Financial Services", "Healthcare and Public Health", "Water and Wastewater Systems", "Information Technology", "Chemical"],
        "questionCount": 10,
        "maturityLevels": ["Article 21(2)"]
    },
    {
        "id": "CRA",
        "name": "EU Cyber Resilience Act",
        "fullName": "Horizontal Cybersecurity Requirements for Products with Digital Elements",
        "description": "Mandatory EU framework prescribing secure-by-design product properties and active vulnerability handling lifecycle rules.",
        "category": "Product Security",
        "sector": "Cross-Sector",
        "sectors": ["Information Technology", "Critical Manufacturing", "Commercial Facilities"],
        "questionCount": 21,
        "maturityLevels": ["Annex I"]
    },
    {
        "id": "SOCI_ACT",
        "name": "Australian SOCI Act",
        "fullName": "Security of Critical Infrastructure Act 2018 Risk Management Program",
        "description": "Australian legislative program mandating critical asset operators to identify and mitigate risks across 4 risk vectors.",
        "category": "Critical Infrastructure",
        "sector": "Cross-Sector",
        "sectors": ["Energy", "Transportation Systems", "Water and Wastewater Systems", "Financial Services", "Healthcare and Public Health", "Information Technology", "Communications", "Food and Agriculture"],
        "questionCount": 16,
        "maturityLevels": ["LIN 23/006"]
    }
]


# Helper to recursively extract text from OSCAL parts list
def extract_control_text(control):
    lines = []
    
    def traverse_parts(parts, indent=0):
        for part in parts:
            prose = part.get("prose")
            label = ""
            # Extract label if available in props
            props = part.get("props", [])
            for prop in props:
                if prop.get("name") == "label":
                    label = prop.get("value", "")
            
            if prose:
                prose_cleaned = prose.replace("{{ insert: param, ", "[").replace(" }}", "]")
                prefix = " " * indent
                if label:
                    lines.append(f"{prefix}{label} {prose_cleaned}")
                else:
                    lines.append(f"{prefix}{prose_cleaned}")
            
            # Recursive check
            if "parts" in part:
                traverse_parts(part["parts"], indent + 2)

    parts = control.get("parts", [])
    traverse_parts(parts)
    
    if not lines:
        return "Verify compliance against " + control.get("title", "") + " standard controls."
    return "\n".join(lines)


# Mapped purdue level based on control family categories
def get_purdue_level_by_family(family_id):
    family_id = family_id.lower()
    # Physical/environmental controls -> Level 1-2
    if family_id in ("pe", "physical"):
        return 1
    # System/Communications protection -> Level 3-4
    elif family_id in ("sc", "ac", "ia", "identification", "access"):
        return 3
    # Device monitoring, response -> Level 2
    elif family_id in ("si", "au", "audit", "system"):
        return 2
    # Governance, training, management -> Level 4
    return 4


# Dynamically loads the official NIST SP 800-53 catalog
def fetch_nist_800_53_controls(fw_name):
    print("Attempting to fetch NIST 800-53 r5 catalog via OSCAL JSON...")
    url = "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as response:
        catalog_data = json.loads(response.read().decode("utf-8"))
        
    groups = catalog_data.get("catalog", {}).get("groups", [])
    questions = []
    
    for g in groups:
        family_title = g.get("title", "Control Family")
        controls = g.get("controls", [])
        for c in controls:
            # Filter to primary controls only
            c_id = c.get("id", "")
            if "." in c_id or "(" in c_id:
                continue
            
            std_code = c_id.upper()
            c_title = c.get("title", "Unnamed Control")
            desc = extract_control_text(c)
            
            # Fetch family abbreviation for purdue level mapping
            fam_abbr = c_id.split("-")[0] if "-" in c_id else "gen"
            p_level = get_purdue_level_by_family(fam_abbr)
            
            questions.append({
                "id": f"question:NIST_800_53_{std_code.replace('-', '_')}",
                "regulation_id": "regulation:NIST_800_53",
                "standard_code": std_code,
                "question_text": f"[{fw_name}] {c_title}: Does the organization satisfy all control requirements for {c_title.lower()}?",
                "description": desc,
                "purdue_level": p_level,
                "category": family_title
            })
    
    print(f"OSCAL catalog parsed successfully. Extracted {len(questions)} primary controls.")
    return questions


# Dynamically loads the official NIST SP 800-82 catalog overlay
def fetch_nist_800_82_controls(fw_name):
    print("Attempting to fetch NIST 800-82 r3 OT Overlay controls via OSCAL JSON...")
    url = "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as response:
        catalog_data = json.loads(response.read().decode("utf-8"))
        
    groups = catalog_data.get("catalog", {}).get("groups", [])
    questions = []
    
    for g in groups:
        family_title = g.get("title", "Control Family")
        controls = g.get("controls", [])
        for c in controls:
            c_id = c.get("id", "")
            if "." in c_id or "(" in c_id:
                continue
            
            std_code = c_id.upper()
            c_title = c.get("title", "Unnamed Control")
            desc = extract_control_text(c)
            
            # Fetch family abbreviation for purdue level mapping
            fam_abbr = c_id.split("-")[0] if "-" in c_id else "gen"
            p_level = get_purdue_level_by_family(fam_abbr)
            
            # Tailor descriptions specifically with OT/ICS overlay notes
            ot_tailoring = (
                f"OT-Specific Guidance (Appendix F): In industrial environments, {c_title.lower()} "
                "requires tailoring for real-time safety, legacy protocol support (Modbus/DNP3), "
                "and network zone separation (Purdue Model)."
            )
            full_desc = f"{desc}\n\n{ot_tailoring}"
            
            questions.append({
                "id": f"question:NIST_800_82_{std_code.replace('-', '_')}",
                "regulation_id": "regulation:NIST_800_82",
                "standard_code": std_code,
                "question_text": f"[{fw_name}] OT {c_title}: Does the organization satisfy tailored OT Overlay requirements for {c_title.lower()}?",
                "description": full_desc,
                "purdue_level": p_level,
                "category": family_title
            })
            
    print(f"OSCAL catalog parsed for NIST 800-82 r3. Extracted {len(questions)} tailored controls.")
    return questions

# Load individual JSON framework blueprints from data/blueprints folder if it exists
CSET_CATALOG_DATA = {}
try:
    blueprints_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "blueprints")
    if os.path.exists(blueprints_dir):
        files = [f for f in os.listdir(blueprints_dir) if f.endswith(".json")]
        for file in files:
            file_path = os.path.join(blueprints_dir, file)
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                fw_id = data["id"]
                # Convert list of question dictionaries back to expected seeder tuples
                # format: (standardCode, name, text, category, purdueLevel, description)
                CSET_CATALOG_DATA[fw_id] = [
                    (
                        q["standardCode"],
                        q["name"],
                        q["text"],
                        q["category"],
                        q["purdueLevel"],
                        q["description"]
                    )
                    for q in data["questions"]
                ]
        print(f"Loaded individual JSON blueprints for {len(CSET_CATALOG_DATA)} frameworks from data/blueprints.")
except Exception as e:
    print(f"Warning: Could not load individual JSON catalog: {e}")


# Generate authentic, highly realistic questions tailored to each framework
def get_bespoke_blueprint(fw):
    fw_id = fw["id"]
    fw_name = fw["name"]
    category = fw["category"]
    sector = fw["sector"]

    # Try dynamic catalog lookup first to avoid truncation and ensure complete mapping
    if fw_id in CSET_CATALOG_DATA:
        return CSET_CATALOG_DATA[fw_id]

    # NERC CIP detailed custom rules
    if fw_id.startswith("NERC_CIP_"):
        sub = fw_id.split("NERC_CIP_")[1]
        if sub == "002":
            return [
                ("R1.1", "BES Cyber Asset Identification", f"Are all critical BES Cyber Assets identified and cataloged under {fw_name}?", "Cyber Asset Identification", 3, f"Verify systematic identification of critical Bulk Electric System cyber systems to enforce {fw_name} baseline controls."),
                ("R1.2", "System Impact Level", f"Are identified BES Cyber Systems categorized into High, Medium, or Low impact levels under {fw_name}?", "Cyber Asset Identification", 3, f"Ensure proper categorization of assets into impact boundaries according to {fw_name} standards."),
                ("R1.3", "Asset Connectivity Vetting", f"Are external routable connectivity paths identified for all BES assets under {fw_name}?", "Cyber Asset Identification", 3, f"Audit routable connectivity pathways and dial-up links crossing electronic perimeters."),
                ("R2", "BES Cyber Asset Update Review", f"Is the BES cyber asset list reviewed and updated at least once every 15 calendar months under {fw_name}?", "Asset Governance", 4, f"Validate continuous compliance auditing and list updates within {fw_name} regulatory cycles."),
                ("R2.1", "Change Identification Procedures", f"Are inventory changes tracked and flagged dynamically under {fw_name}?", "Asset Governance", 3, f"Verify that configuration changes trigger re-evaluation of asset identification."),
                ("R2.2", "System Re-evaluations", f"Are BES asset classifications re-evaluated upon network segment modifications under {fw_name}?", "Asset Governance", 4, f"Ensure risk scores are adjusted to maintain alignment with {fw_name} criteria."),
                ("R3", "BES Connectivity Mapping", f"Are all external logical links mapped and approved under {fw_name}?", "Connectivity Vetting", 3, f"Audit external communications crossings and boundary data flows for critical nodes."),
                ("R3.1", "Asset Inventory Database", f"Is an active database list of identified physical devices maintained under {fw_name}?", "Cyber Asset Identification", 3, f"Verify serial numbers, MAC addresses, and physical device counts against the verified catalog."),
                ("R4", "BES Classification Documentation", f"Is the categorization documentation protected against unauthorized access under {fw_name}?", "Asset Governance", 4, f"Ensure the BES asset database is encrypted at rest and locked down with strict RBAC."),
                ("R4.1", "BES Regional Auditing Vetting", f"Are BES asset lists prepared for annual auditing by regional compliance officers under {fw_name}?", "Asset Governance", 4, f"Validate that logs are formatted correctly to support regulatory NERC auditor sweeps.")
            ]
        elif sub == "003":
            return [
                ("R1", "Cyber Security Policy", f"Are there documented, approved cybersecurity policies for BES systems under {fw_name}?", "Security Management Policies", 4, f"Validate corporate cybersecurity management plan updates and approval thresholds under {fw_name}."),
                ("R1.1", "Policy Annual Approval", f"Are cybersecurity policies reviewed and approved annually by senior management under {fw_name}?", "Security Management Policies", 4, f"Ensure executive signing gates are met within standard regulatory periods under {fw_name}."),
                ("R2", "Designated Leadership", f"Is a designated security leader assigned with formal responsibility for CIP compliance under {fw_name}?", "Designated Leadership", 4, f"Check leadership designations and escalation routes for security incident alerts under {fw_name}."),
                ("R3", "Access Control Policies", f"Are access authorization policies documented and enforced under {fw_name}?", "Security Management Policies", 3, f"Verify logical credential policy updates and authentication enforcement gates under {fw_name}."),
                ("R4", "Low-Impact System Controls", f"Are change control procedures documented for low-impact BES assets under {fw_name}?", "Change Control & Management", 3, f"Audit baseline modification steps for low-impact utility devices under {fw_name}."),
                ("R4.1", "Incident Response for Low-Impact", f"Are incident response guidelines defined for low-impact assets under {fw_name}?", "Change Control & Management", 3, f"Ensure containment protocols exist for lower-tier electrical switches under {fw_name}."),
                ("R5", "Asset Protection Program", f"Is an information protection program active to safeguard cyber asset data under {fw_name}?", "Security Management Policies", 4, f"Verify secure handling policies for network topologies and device configuration files under {fw_name}."),
                ("R5.1", "Physical Security Policy", f"Are physical access policies documented for control rooms and substations under {fw_name}?", "Security Management Policies", 3, f"Audit building entry standards, lock key controls, and visitor regulations under {fw_name}."),
                ("R6", "Supplier Vetting Controls", f"Are supply chain risk management policies integrated into procurement under {fw_name}?", "Security Management Policies", 4, f"Ensure vendor security control assessments are mandatory before system acquisitions under {fw_name}."),
                ("R6.1", "Annual Policy Vetting Review", f"Are security policy controls reviewed and audited annually under {fw_name}?", "Security Management Policies", 4, f"Verify systematic review of governance controls to satisfy annual compliance audits under {fw_name}.")
            ]
        elif sub == "004":
            return [
                ("R1", "Security Awareness Training", f"Is quarterly security awareness training mandatory for all staff under {fw_name}?", "Personnel Awareness & Training", 4, f"Verify standard cyber hygiene and safety training procedures under {fw_name}."),
                ("R2", "Personnel Background Vetting", f"Are seven-year criminal background checks performed for all personnel with unescorted access under {fw_name}?", "Personnel Vetting", 3, f"Audit the personnel vetting and screening process in accordance with {fw_name} guidelines."),
                ("R3", "Access Authorization Process", f"Are system access privileges reviewed and authorized prior to activation under {fw_name}?", "Access Authorization", 3, f"Check access provisioning workflows and authorization records under {fw_name}."),
                ("R3.1", "Annual Authorization Audit", f"Is the list of authorized personnel reviewed at least once every 15 calendar months under {fw_name}?", "Access Authorization", 4, f"Ensure continuous authorization vetting and audit trail updates under {fw_name}."),
                ("R4", "Access Revocation Process", f"Are access privileges revoked immediately upon employee termination under {fw_name}?", "Access Authorization", 3, f"Verify automatic lockouts and credentials purging procedures under {fw_name}."),
                ("R4.1", "Immediate Revocation Verification", f"Is a confirmation trace logged within 24 hours of personnel offboarding under {fw_name}?", "Access Authorization", 3, f"Check logical cleanup logs following staff exit dates under {fw_name}."),
                ("R5", "Training Record Retention", f"Are personnel training records and vetting documents retained for audit under {fw_name}?", "Personnel Vetting", 4, f"Ensure all physical and electronic training certificates are archived securely under {fw_name}."),
                ("R5.1", "Contractor Vetting Program", f"Are external contractors subjected to the same background checks as internal staff under {fw_name}?", "Personnel Vetting", 3, f"Audit third-party consultant screening workflows to maintain the {fw_name} posture."),
                ("R6", "Operational Role Vetting", f"Are engineering setpoint modifications restricted to certified operator roles under {fw_name}?", "Access Authorization", 3, f"Ensure role-based access restricts sensitive control operations under {fw_name}."),
                ("R6.1", "Vetting Program Audits", f"Are background check processes audited annually for compliance under {fw_name}?", "Personnel Vetting", 4, f"Audit the screening framework and external search agencies under {fw_name}.")
            ]
        elif sub == "005":
            return [
                ("R1", "Electronic Security Perimeter (ESP)", f"Is a defined Electronic Security Perimeter constructed to isolate BES cyber systems under {fw_name}?", "Electronic Security Perimeters", 3, f"Check that boundary firewalls isolate critical operations loops under {fw_name}."),
                ("R1.1", "ESP Boundary Firewall Control", f"Are firewall rules configured to block all unmediated traffic traversing the ESP under {fw_name}?", "Electronic Security Perimeters", 3, f"Audit edge router filtering tables and zone communication blocks under {fw_name}."),
                ("R1.2", "Interactive Remote Access Management", f"Are all remote administrative connections terminated within a secure DMZ under {fw_name}?", "Interactive Remote Access", 3, f"Verify dedicated operational DMZ gateway proxies exist under {fw_name}."),
                ("R2", "Remote Access Authentication", f"Is multi-factor authentication enforced for all external remote access sessions under {fw_name}?", "Interactive Remote Access", 4, f"Check MFA settings for external vendor tunnels and mobile technicians under {fw_name}."),
                ("R2.1", "Jump Server Remote Mediation", f"Are remote session channels mediated through Jump Servers within the ESP under {fw_name}?", "Interactive Remote Access", 3, f"Validate jump host dual-approval gates and keystroke recording under {fw_name}."),
                ("R2.2", "Session Inactivity Timeout", f"Do remote administrative active sessions lock automatically after 15 minutes of idle state under {fw_name}?", "Interactive Remote Access", 3, f"Audit timeout rules on administrative terminals inside the {fw_name} perimeter."),
                ("R2.3", "Remote Session Active Logging", f"Are all remote contractor sessions monitored and logged continuously under {fw_name}?", "Interactive Remote Access", 3, f"Verify centralized audit trail updates for external connection events under {fw_name}."),
                ("R3", "ESP Diagnostic Interface Lockdown", f"Are unused physical ports and services disabled on ESP boundary switches under {fw_name}?", "Electronic Security Perimeters", 2, f"Check physical port blockers and switch configuration records under {fw_name}."),
                ("R3.1", "ESP Access Control Audits", f"Are perimeter firewall rule reviews executed at least once every 90 days under {fw_name}?", "Electronic Security Perimeters", 4, f"Verify regular firewall rule compliance sweeps under {fw_name}."),
                ("R3.2", "ESP Logical Zone Separation", f"Are operational networks segmented from corporate LANs using redundant firewalls under {fw_name}?", "Electronic Security Perimeters", 3, f"Audit network topology to confirm no direct routing between Level 4 and Level 2 exists.")
            ]
        elif sub == "006":
            return [
                ("R1", "Physical Security Perimeter (PSP)", f"Is a Physical Security Perimeter implemented to protect BES Cyber Assets under {fw_name}?", "Physical Security Perimeters", 3, f"Check building structures, fence perimeters, and control rooms under {fw_name}."),
                ("R1.1", "Substation Facility Access Gates", f"Are physical access controls (badge readers, CCTV) active at substation gates under {fw_name}?", "Physical Security Perimeters", 3, f"Verify that only authorized, badged personnel can cross facility perimeters under {fw_name}."),
                ("R1.2", "Physical Access Logging", f"Are all physical entries and exits logged and archived for at least 90 days under {fw_name}?", "Physical Security Perimeters", 3, f"Audit entry logbooks and electronic card reader logs under {fw_name}."),
                ("R2", "Visitor Escort and Logging", f"Are visitors without unescorted privileges escorted at all times within the PSP under {fw_name}?", "Visitor Controls & Escorts", 3, f"Verify operator safety guidelines and physical monitoring protocols for external visitors under {fw_name}."),
                ("R2.1", "Visitor Log Book Audits", f"Are visitor logs reviewed weekly to identify unauthorized access attempts under {fw_name}?", "Visitor Controls & Escorts", 4, f"Check review signatures on visitor registers under {fw_name}."),
                ("R2.2", "Hardware Enclosure Locking", f"Are hardware cabinets and terminal blocks locked inside secure steel enclosures under {fw_name}?", "Physical Security Perimeters", 1, f"Verify padlock checks and enclosure seals for controllers in the field under {fw_name}."),
                ("R3", "Physical Intrusion Alerting", f"Are active alarms triggered immediately in the SCADA console upon unauthorized entry under {fw_name}?", "Physical Security Perimeters", 3, f"Test tamper alarms on server racks and control room doors under {fw_name}."),
                ("R3.1", "CCTV Security Camera Vetting", f"Are security cameras checked daily for active video streaming and alignment under {fw_name}?", "Physical Security Perimeters", 3, f"Verify CCTV video feed feeds to the central security desk under {fw_name}."),
                ("R4", "Enclosure Door Contact Sensors", f"Are magnetic door contact sensors installed on all critical diagnostic panels under {fw_name}?", "Physical Security Perimeters", 1, f"Audit telemetry status of door sensors in the SCADA tag list under {fw_name}."),
                ("R4.1", "Physical Security Plan Review", f"Is the physical security plan reviewed and updated annually under {fw_name}?", "Visitor Controls & Escorts", 4, f"Validate executive approval of the physical protection plan under {fw_name}.")
            ]
        elif sub == "007":
            return [
                ("R1", "Ports & Services Lockdown", f"Are unused physical and logical ports locked out on all field devices under {fw_name}?", "System Security Management", 2, f"Check that unused serial, USB, and Ethernet ports are disabled on PLCs and switches."),
                ("R1.1", "Insecure Protocols Disabling", f"Are insecure protocols (such as raw Telnet, HTTP, or FTP) disabled on all PLCs under {fw_name}?", "System Security Management", 2, f"Verify that only secure services like SSH or HTTPS are active on intelligent units under {fw_name}."),
                ("R2", "Patch Management and Scanning", f"Are firmware patch vulnerability assessments executed at least once every 35 days under {fw_name}?", "Patch Management", 2, f"Ensure systematic vulnerability analysis is conducted inside standard compliance windows under {fw_name}."),
                ("R2.1", "Sandbox Patch Validation", f"Are security patches validated in offline sandboxes before active deployment under {fw_name}?", "Patch Management", 2, f"Audit test reports verifying patch compatibility with operational configurations under {fw_name}."),
                ("R3", "Malicious Code Prevention", f"Are active malware detection engines installed and updated daily on all hosts under {fw_name}?", "Malicious Code Prevention", 2, f"Check antivirus, host IDS, and boundary scanners for process databases under {fw_name}."),
                ("R3.1", "Antivirus Signature Sweeps", f"Are daily antivirus signature updates verified on engineering workstations under {fw_name}?", "Malicious Code Prevention", 2, f"Verify configuration sweeps for local malware databases under {fw_name}."),
                ("R4", "Security Event Logging", f"Are security events logged continuously with precise, synchronized timestamps under {fw_name}?", "System Logging & Auditing", 2, f"Verify NTP time sync and continuous logging to a dedicated secondary buffer under {fw_name}."),
                ("R4.1", "Write-Once Syslog Storage", f"Are audit logs streamed in real-time to a secure, centralized WORM repository under {fw_name}?", "System Logging & Auditing", 2, f"Ensure trace logs are immune to local manipulation by ransomware under {fw_name}."),
                ("R5", "Access Control Vetting", f"Are unique accounts assigned to all users, completely disabling shared logins under {fw_name}?", "System Security Management", 3, f"Verify logical credential policy updates and authentication enforcement gates under {fw_name}."),
                ("R5.1", "Administrative Session Terminations", f"Do active sessions lock automatically after 10 minutes of idle state under {fw_name}?", "System Security Management", 3, f"Verify screen locking settings on engineering workstations under {fw_name}.")
            ]
        elif sub == "008":
            return [
                ("R1", "Cyber Security Incident Identification", f"Are real-time alerting systems active to identify grid cybersecurity incidents under {fw_name}?", "Incident Reporting & Response", 3, f"Check that SCADA alarm logs feed into a security monitoring console under {fw_name}."),
                ("R1.1", "Incident Classification Procedures", f"Are incidents classified according to documented severity thresholds under {fw_name}?", "Incident Reporting & Response", 4, f"Audit incident logs to confirm appropriate threat scoring and escalations under {fw_name}."),
                ("R2", "Incident Response Plan (IRP)", f"Is a formal cybersecurity incident response plan documented and active under {fw_name}?", "Incident Reporting & Response", 4, f"Verify the response plan is updated and signed off by the security team under {fw_name}."),
                ("R2.1", "IRP Testing and Drills", f"Is the incident response plan tested annually through active simulation drills under {fw_name}?", "Incident Reporting & Response", 3, f"Audit scenario reviews, tabletop notes, and drill logs under {fw_name}."),
                ("R2.2", "Regulatory Event Reporting", f"Are critical grid incidents reported to CISA and E-ISAC within 24 hours of classification under {fw_name}?", "Incident Reporting & Response", 4, f"Verify reporting procedures and communication channels under {fw_name}."),
                ("R3", "IRP Role and Task Vetting", f"Are specific emergency roles and communication protocols defined for staff under {fw_name}?", "Incident Reporting & Response", 4, f"Check designated incident management assignments under {fw_name}."),
                ("R3.1", "Incident Log Retention", f"Are incident response logs and post-mortem reports archived for audits under {fw_name}?", "Incident Reporting & Response", 4, f"Ensure at least three years of incident audit history is preserved securely under {fw_name}."),
                ("R4", "Incident Post-Mortem Reviews", f"Are post-incident reviews conducted within 90 days of resolving critical events under {fw_name}?", "Incident Reporting & Response", 4, f"Verify that post-mortem notes are distributed to the engineering board under {fw_name}."),
                ("R4.1", "Incident Response Plan Updates", f"Is the IRP updated with lessons learned from tests and actual events under {fw_name}?", "Incident Reporting & Response", 4, f"Audit updates to the playbooks to prevent repeating past containment errors under {fw_name}."),
                ("R5", "Annual Tabletop Exercises", f"Are emergency water or grid crisis table-tops conducted annually under {fw_name}?", "Incident Reporting & Response", 3, f"Verify testing schedules with external regional coordinators under {fw_name}.")
            ]
        elif sub == "009":
            return [
                ("R1", "Disaster Recovery Plan Documentation", f"Is a detailed recovery plan documented for all BES Cyber Systems under {fw_name}?", "Recovery & Resiliency Planning", 4, f"Verify continuous availability planning and operational manuals under {fw_name}."),
                ("R1.1", "Backup Strategy & Schedules", f"Are daily backups of SCADA databases and RTU configurations executed under {fw_name}?", "Recovery & Resiliency Planning", 3, f"Audit automated backup logs and file directory paths under {fw_name}."),
                ("R1.2", "Encrypted Backup Offsite Storage", f"Are backups encrypted and stored offline in secure, fireproof safes under {fw_name}?", "Recovery & Resiliency Planning", 3, f"Check that offsite storage protocols isolate data from ransom threats under {fw_name}."),
                ("R2", "Recovery Plan Testing", f"Are disaster recovery plans physically tested to verify manual control operations under {fw_name}?", "Recovery & Resiliency Planning", 3, f"Ensure the DR framework is validated under simulated grid failures under {fw_name}."),
                ("R2.1", "Disaster Recovery Tabletop", f"Are recovery tabletop exercises performed annually with operations staff under {fw_name}?", "Recovery & Resiliency Planning", 3, f"Validate emergency staffing maps and utility recovery manuals under {fw_name}."),
                ("R3", "Manual Control Override Capabilities", f"Can system operations transition to manual emergency control overrides during blackouts under {fw_name}?", "Recovery & Resiliency Planning", 1, f"Verify local bypass handles and hand-operated switchgear exist under {fw_name}."),
                ("R3.1", "Redundant Processor Failovers", f"Are critical SCADA servers configured with automated hardware failover under {fw_name}?", "Recovery & Resiliency Planning", 2, f"Verify secondary hot-standby servers keep synced tags active under {fw_name}."),
                ("R4", "Recovery Documentation Access", f"Are recovery manuals stored in offline, physical format in control rooms under {fw_name}?", "Recovery & Resiliency Planning", 4, f"Ensure plant operators can locate print procedures during network down states under {fw_name}."),
                ("R4.1", "Backup Integrity Restores", f"Are backup files tested quarterly to verify they can be restored successfully under {fw_name}?", "Recovery & Resiliency Planning", 3, f"Verify dry-run SQL restores onto isolated laboratory staging hosts under {fw_name}."),
                ("R4.2", "Emergency Power Systems", f"Are emergency diesel generators tested monthly under load under {fw_name}?", "Recovery & Resiliency Planning", 2, f"Check starting batteries, fuel levels, and load transfer switches under {fw_name}.")
            ]
        elif sub == "010":
            return [
                ("R1", "Configuration Baseline Tracking", f"Is a current, authorized baseline configuration documented for all assets under {fw_name}?", "Configuration Change Control", 2, f"Verify that switch configurations and PLC logic programs are formally baselined."),
                ("R1.1", "Baseline Integrity Vetting", f"Are baseline configuration hashes validated before performing upgrades under {fw_name}?", "Configuration Change Control", 2, f"Check that configuration files match verified hashes before installation under {fw_name}."),
                ("R1.2", "Dual-Signature Logic Downloads", f"Are dual-operator signatures required before loading code changes to PLCs under {fw_name}?", "Configuration Change Control", 2, f"Audit engineering access gates and double-signature authorization workflows under {fw_name}."),
                ("R2", "Change Authorization & Testing", f"Are system modifications reviewed, tested, and authorized before release under {fw_name}?", "Configuration Change Control", 3, f"Verify test lab reports and change control board logs under {fw_name}."),
                ("R2.1", "Change Verification Auditing", f"Are configuration baselines audited at least once every 12 calendar months under {fw_name}?", "Configuration Change Control", 2, f"Ensure random checks find no unauthorized software or physical drift under {fw_name}."),
                ("R3", "Active Vulnerability Assessments", f"Are active vulnerability scans executed on all BES cyber systems annually under {fw_name}?", "Vulnerability Assessments", 3, f"Verify scan ranges, reporting summaries, and security remediation schedules under {fw_name}."),
                ("R3.1", "Vulnerability Remediations Scheduling", f"Are identified vulnerabilities resolved or mitigated within 90 days under {fw_name}?", "Vulnerability Assessments", 4, f"Check that patch cycles resolve critical exposures on the grid under {fw_name}."),
                ("R3.2", "Substation Port Scanning", f"Are diagnostic scans run on substation interfaces to find rogue switches under {fw_name}?", "Vulnerability Assessments", 3, f"Audit network scanner configurations and target subnet exclusions under {fw_name}."),
                ("R4", "Baseline Drift Alerts", f"Are alerts configured for sudden PLC configuration changes or code updates under {fw_name}?", "Configuration Change Control", 2, f"Check SCADA alarm rule profiles mapping baseline modifications under {fw_name}."),
                ("R4.1", "SCRM Supply Vetting Review", f"Are configuration updates audited for third-party security compliance under {fw_name}?", "Configuration Change Control", 4, f"Ensure all hardware and software changes undergo a supply risk review under {fw_name}.")
            ]
        elif sub == "011":
            return [
                ("R1", "BES Cyber Information Protection", f"Are operational databases and network maps protected from unauthorized disclosure under {fw_name}?", "Information Protection", 4, f"Verify sensitivity markings and access authorization lists for grid schematics."),
                ("R1.1", "Information Storage Encryption", f"Is sensitive BES cyber system information encrypted at rest under {fw_name}?", "Information Protection", 3, f"Audit file system or database encryption settings for engineering repositories under {fw_name}."),
                ("R2", "Asset Decommissioning Sanitization", f"Is complete cryptographic scrubbing executed before decommissioning units under {fw_name}?", "Asset Sanitization", 2, f"Verify that all secure keys and configuration profiles are completely wiped on retirement."),
                ("R2.1", "Physical Media Destruction", f"Are retired storage drives physically shredded or degaussed under {fw_name}?", "Asset Sanitization", 2, f"Check the drive shredding logs and physical disposal manifests under {fw_name}."),
                ("R3", "Information Classification Scheme", f"Are operational documents classified by sensitivity level under {fw_name}?", "Information Protection", 4, f"Ensure status labels (Internal, Confidential, Secret) are embedded on network maps under {fw_name}."),
                ("R3.1", "Access to Configuration Information", f"Is access to detailed network topologies restricted to security cleared staff under {fw_name}?", "Information Protection", 3, f"Audit folder permissions and active directory groups protecting the design charts."),
                ("R3.2", "Secure Transient Data Transfers", f"Are transient data files encrypted during transmission over public networks under {fw_name}?", "Information Protection", 3, f"Verify secure transmission protocols (SFTP, HTTPS) for utility diagnostics under {fw_name}."),
                ("R4", "Sanitization Verification Logs", f"Are formal sanitization logs maintained for all decommissioned cyber systems under {fw_name}?", "Asset Sanitization", 4, f"Verify certified destruction signatures are filed for regulatory audits under {fw_name}."),
                ("R4.1", "Information Protection Auditing", f"Are information security controls reviewed annually for compliance under {fw_name}?", "Information Protection", 4, f"Audit program review timelines and executive sign-off records under {fw_name}."),
                ("R4.2", "Transient Media Control", f"Are USB drives blocked or strictly managed using encrypted enterprise media under {fw_name}?", "Information Protection", 3, f"Audit endpoint security settings preventing standard USB stick insertions under {fw_name}.")
            ]
        elif sub == "013":
            return [
                ("R1", "Supply Chain Risk Assessment", f"Are security risk audits executed for all grid hardware procurement under {fw_name}?", "Supply Chain Risk Management", 4, f"Verify procurement guidelines incorporate supply chain vetting standards under {fw_name}."),
                ("R1.1", "Vendor Security Control Vetting", f"Are third-party vendor security practices assessed prior to signing contracts under {fw_name}?", "Supply Chain Risk Management", 4, f"Verify vendor questionnaire reviews and risk scoring methodologies under {fw_name}."),
                ("R1.2", "Software Integrity Verification", f"Are digital signatures and software hashes validated for all vendor logic updates under {fw_name}?", "Supply Chain Risk Management", 4, f"Ensure code updates are validated before execution inside operations networks under {fw_name}."),
                ("R2", "Supply Chain Risk Management Policy", f"Is a formal supply chain policy reviewed and approved annually under {fw_name}?", "Supply Chain Risk Management", 4, f"Validate executive-level approval of procurement control programs under {fw_name}."),
                ("R2.1", "Vendor Notification Thresholds", f"Are vendors contractually required to report cybersecurity incidents within 48 hours under {fw_name}?", "Supply Chain Risk Management", 4, f"Check standard master service agreement clauses for incident warning terms under {fw_name}."),
                ("R2.2", "Supplier Remote Access Controls", f"Are vendor remote connections strictly authenticated using dual-signature jump hosts under {fw_name}?", "Supply Chain Risk Management", 3, f"Ensure supplier connections terminate at a secure proxy inside the operational DMZ under {fw_name}."),
                ("R2.3", "Supply Chain Vulnerability Vetting", f"Are third-party components scanned for vulnerabilities before integration under {fw_name}?", "Supply Chain Risk Management", 4, f"Verify dependency reviews and software bill of materials (SBOM) checks under {fw_name}."),
                ("R3", "Vendor Configuration Management", f"Do vendors provide verified configuration baselines for all delivered units under {fw_name}?", "Supply Chain Risk Management", 3, f"Validate device delivery inspection sheets and master firmware hash baselines under {fw_name}."),
                ("R3.1", "Vendor Security Training Verification", f"Are vendor technicians required to complete cybersecurity training under {fw_name}?", "Supply Chain Risk Management", 4, f"Ensure supplier support staff verify training completion before system access under {fw_name}."),
                ("R3.2", "Supplier Audit Documentation", f"Are supply chain audit reports archived and available for regulatory review under {fw_name}?", "Supply Chain Risk Management", 4, f"Ensure procurement vetting records are stored to support NERC CIP audits under {fw_name}.")
            ]
        elif sub == "014":
            return [
                ("R1", "Substation Threat Risk Assessment", f"Are threat risk assessments executed for all critical transmission substations under {fw_name}?", "Transmission Substation Security", 4, f"Ensure physical security risk matrices score explosive, vehicle, and ballistics threats."),
                ("R1.1", "Critical Substation Identification", f"Are critical substations identified whose loss would cause cascading grid instability under {fw_name}?", "Transmission Substation Security", 4, f"Audit engineering power-flow analysis models mapping bulk grid outages under {fw_name}."),
                ("R2", "Physical Security Plan Development", f"Is a physical security plan documented and implemented for each critical substation under {fw_name}?", "Transmission Substation Security", 4, f"Verify that the facility security plan is active and approved by management under {fw_name}."),
                ("R2.1", "Physical Substation Fencing", f"Are substation perimeters secured with industrial fencing and razor wire under {fw_name}?", "Physical Barriers & Cabinets", 3, f"Verify fence integrity, gate locking systems, and warning signage under {fw_name}."),
                ("R2.2", "CCTV Monitoring Gates", f"Are high-definition CCTV security cameras active at all entry gates under {fw_name}?", "Physical Barriers & Cabinets", 3, f"Check camera views, night vision capabilities, and central recording buffers under {fw_name}."),
                ("R2.3", "Motion Sensor Perimeter Alarms", f"Are motion sensors active along the substation fencing line under {fw_name}?", "Physical Barriers & Cabinets", 3, f"Audit electronic sensors integrated with perimeter alarm consoles under {fw_name}."),
                ("R3", "Substation Control Room Locks", f"Are main control room entries secured with biometric and card scanners under {fw_name}?", "Physical Barriers & Cabinets", 3, f"Verify reader configurations, electronic locks, and badge logs under {fw_name}."),
                ("R3.1", "Enclosure Cabinet Hardening", f"Are outdoor terminal boxes and wiring panels physically locked under {fw_name}?", "Physical Barriers & Cabinets", 1, f"Audit physical padlock audits for external marshalling enclosures under {fw_name}."),
                ("R4", "Third-Party Physical Vetting", f"Are all physical security controls verified by an independent third-party auditor under {fw_name}?", "Transmission Substation Security", 4, f"Validate audit report findings and sign-off records under {fw_name}."),
                ("R4.1", "Physical Security Plan Updates", f"Are physical security plans reviewed and updated at least once every 30 calendar months under {fw_name}?", "Transmission Substation Security", 4, f"Verify plan renewal cycles and approval dates to maintain compliance under {fw_name}.")
            ]

    # IEC 62443 detailed subpart rules
    if fw_id.startswith("IEC_62443_"):
        sub = fw_id.split("IEC_62443_")[1]
        if sub == "3_3":
            return [
                ("SR 1.1", "IAC - User Identification", f"Are human users uniquely identified and authenticated before accessing {fw_name} systems?", "Identification & Authentication Control", 3, "Verify unique operator ID validation gates across all SCADA interfaces and HMIs."),
                ("SR 1.2", "IAC - Software Identification", f"Are software processes uniquely identified and authenticated on {fw_name} controllers?", "Identification & Authentication Control", 2, "Ensure process signatures and execution controls restrict unauthorized code loads."),
                ("SR 1.3", "IAC - Multi-Factor Authentication", f"Is multi-factor authentication enforced for remote connections to {fw_name} components?", "Identification & Authentication Control", 4, "Check MFA configurations utilizing hardware tokens for external remote support tunnels."),
                ("SR 2.1", "UC - Authorization Enforcement", f"Is role-based authorization configured to restrict {fw_name} setpoint controls?", "Use Control", 3, "Audit RBAC policies limiting execution of sensitive commands to certified operator profiles."),
                ("SR 2.2", "UC - Inactive Session Lock", f"Are interactive engineering sessions in {fw_name} environments locked automatically?", "Use Control", 3, "Verify automated session logout thresholds on engineering terminals and operations HMIs."),
                ("SR 2.3", "UC - Default Credentials Lock", f"Are default manufacturer credentials disabled across all {fw_name} field devices?", "Use Control", 2, "Ensure default passwords, accounts, and insecure configurations are changed on commissioning."),
                ("SR 2.4", "UC - Jump Host Mediation", f"Are remote session channels mediated through Jump Servers within the {fw_name} architecture?", "Use Control", 3, "Validate secure administrative gateway transit with complete session logging and operator approvals."),
                ("SR 3.1", "SI - Message Integrity", f"Is communication integrity protected using cryptographic signatures on {fw_name} buses?", "System Integrity", 3, "Verify integrity checks and signatures on Modbus/TCP or DNP3 protocol packets traversed."),
                ("SR 3.2", "SI - Malicious Code Protection", f"Are active malware detection engines installed at {fw_name} host boundaries?", "System Integrity", 2, "Audit antivirus, active endpoint defenses, and boundary filtering rules for process hosts."),
                ("SR 3.3", "SI - Firmware Hash Vetting", f"Are cryptographic firmware signatures validated before updating {fw_name} controllers?", "System Integrity", 3, "Ensure PLC or RTU firmware updates are cryptographically checked against authorized baselines before flashing."),
                ("SR 4.1", "DC - Cryptographic Encryption", f"Is cryptographic encryption enforced for all {fw_name} data transit?", "Data Confidentiality", 3, "Audit SSL/TLS configurations and VPN encryption algorithms traversing physical security zones."),
                ("SR 4.2", "DC - Enclave Key Storage", f"Are cryptographic keys managed in secure hardware enclaves within {fw_name} modules?", "Data Confidentiality", 4, "Verify secure hardware-backed cryptographic modules (HSM) protecting operational credentials."),
                ("SR 5.1", "RDF - Zone Segmentation", f"Are logical electronic security zones strictly separated by defined {fw_name} conduits?", "Restricted Data Flow", 3, "Ensure network boundaries map to Purdue Levels 1-5 with physical or logical segregation conduits."),
                ("SR 5.2", "RDF - Direct Bypass Block", f"Is direct unmediated traffic blocked between Level 1-2 process loops and Level 4 under {fw_name}?", "Restricted Data Flow", 1, "Validate perimeter-edge firewall rules blocking direct connections between office LANs and field assets.")
            ]
        elif sub == "4_2":
            return [
                ("CR 1.1", "Embedded User Auth", f"Are embedded devices requiring unique human user authentication under {fw_name}?", "Embedded Device Requirements", 3, "Check that PLCs, RTUs, and smart switches require individual logins for engineering modifications."),
                ("CR 1.2", "Software Process Vetting", f"Are software processes authenticated before executing on embedded controllers under {fw_name}?", "Embedded Device Requirements", 2, "Verify that code signatures are checked before running ladder logic or scripts on the unit."),
                ("CR 2.1", "Local Diagnostic Lock", f"Are physical diagnostic serial ports locked or logically disabled under {fw_name}?", "Embedded Device Requirements", 1, "Ensure RS-232, RS-485, and USB interfaces are physically locked or disabled to prevent local intrusions."),
                ("CR 3.1", "Secure Boot Validation", f"Do embedded controllers enforce secure boot utilizing hardware trust roots under {fw_name}?", "Embedded Device Requirements", 3, "Audit the secure boot sequence ensuring only cryptographically signed firmware is loaded."),
                ("CR 4.1", "Host Hardening Checks", f"Are unnecessary services and network daemons disabled on all host systems under {fw_name}?", "Host Device Requirements", 2, "Validate that unused services (e.g. FTP, raw Telnet, HTTP) are disabled in the device settings."),
                ("CR 5.1", "Network Interface lockdown", f"Are unused physical ethernet ports on network switches logically locked under {fw_name}?", "Network Device Requirements", 1, "Verify physical switchports are administratively disabled and locked inside secure enclosures."),
                ("CR 6.1", "Software App Session Lock", f"Do HMI software applications automatically log out idle sessions under {fw_name}?", "Software Application Requirements", 3, "Verify automated session lock and termination parameters in the SCADA control software interface."),
                ("CR 7.1", "Device Event Auditing", f"Do embedded controllers log configuration and logic changes to a local buffer under {fw_name}?", "Embedded Device Requirements", 2, "Check internal device logs capturing configuration changes, reboots, and administrative adjustments."),
                ("CR 7.2", "Syslog REAL-TIME Stream", f"Are local device logs streamed in real-time to a secure syslog receiver under {fw_name}?", "Embedded Device Requirements", 2, "Verify that device logs are continuously pushed to the centralized SIEM over secure channels."),
                ("CR 7.3", "Firmware Hash Verification", f"Are PLC firmware signatures verified against authorized baselines before flashing under {fw_name}?", "Embedded Device Requirements", 3, "Validate the cryptographic hash review process prior to initiating system firmware upgrades.")
            ]
        elif sub == "2_1":
            return [
                ("CSMS 1.1", "Security Program Governance", f"Is there an established, funded Industrial Security Program under {fw_name}?", "Governance & Management", 4, "Verify corporate commitment, budgets, and charter for the CSMS security program."),
                ("CSMS 1.2", "Designated Security Leader", f"Is an executive security leader formally assigned responsibility for CSMS under {fw_name}?", "Governance & Management", 4, "Ensure roles, responsibilities, and reporting escalations are defined for control systems security."),
                ("CSMS 2.1", "ICS Cyber Risk Assessment", f"Are active risk assessments executed annually for all control systems under {fw_name}?", "Risk Analysis & Assessment", 4, "Audit risk assessment matrices tracking impact and likelihood scores for OT environments."),
                ("CSMS 2.2", "Asset Connectivity Vetting", f"Are all external logical and routable connections documented and reviewed under {fw_name}?", "Risk Analysis & Assessment", 3, "Verify lists of authorized remote connections, vendor tunnels, and perimeter boundary lines."),
                ("CSMS 3.1", "Asset Inventory Baseline", f"Is a comprehensive, accurate hardware and software asset inventory maintained under {fw_name}?", "Asset Management", 3, "Audit automated asset scans and manual inventories listing critical PLCs and RTUs."),
                ("CSMS 3.2", "Information Protection Schemes", f"Are critical system topologies and configurations protected from disclosure under {fw_name}?", "Asset Management", 4, "Ensure network drawings, IP schemes, and config baselines are encrypted and restricted to cleared staff."),
                ("CSMS 4.1", "Security Policy Management", f"Are documented cybersecurity policies reviewed, updated, and signed annually under {fw_name}?", "Policies & Procedures", 4, "Verify systematic review of governance controls to satisfy CSMS compliance targets."),
                ("CSMS 4.2", "Personnel Security Vetting", f"Do personnel with unescorted access to critical zones undergo background checks under {fw_name}?", "Policies & Procedures", 3, "Check that pre-employment screening and annual vetting rules are active for staff."),
                ("CSMS 4.3", "Supplier Vetting Controls", f"Are external vendors and third-party contractors audited for CSMS compliance under {fw_name}?", "Policies & Procedures", 4, "Validate supply chain risk reviews and integration contract clauses for service providers."),
                ("CSMS 4.4", "Disaster Recovery Testing", f"Are business continuity and disaster recovery plans tested through annual drills under {fw_name}?", "Policies & Procedures", 3, "Verify tabletop exercises simulating SCADA ransomware attacks and manual process overrides.")
            ]
        elif sub == "2_4":
            return [
                ("SP 1.1", "Service Integration Security", f"Are security integration guidelines provided for all commissioned {fw_name} components?", "Service Provider Requirements", 4, "Check that integrators provide a security configuration description for field switch networks."),
                ("SP 1.2", "Operational Zone Vetting", f"Are integration processes validating electronic zone perimeters and conduits under {fw_name}?", "Service Provider Requirements", 3, "Verify that zone routing boundaries conform exactly to the baseline design maps."),
                ("SP 2.1", "Vendor Patch Verification", f"Do service providers validate software patches before performing maintenance under {fw_name}?", "Service Provider Requirements", 2, "Audit patch testing processes to prevent introduction of malicious logic to operational PLCs."),
                ("SP 2.2", "Vendor Credentials Disabling", f"Are default supplier logins disabled upon commissioning {fw_name} hardware?", "Service Provider Requirements", 2, "Ensure manufacturer credentials are deleted and replaced by unique operator passwords."),
                ("SP 3.1", "Supplier Staff Clearance Vetting", f"Do vendor technicians undergo criminal background screening under {fw_name}?", "Service Provider Requirements", 3, "Ensure third-party staff verify clearances before performing onsite field actions."),
                ("SP 3.2", "External Remote Mediation", f"Are remote contractor support VPNs mediated through secure multi-factor jump hosts under {fw_name}?", "Service Provider Requirements", 3, "Validate that remote sessions require dual operator signoffs and complete logging."),
                ("SP 4.1", "Product Installation Guidelines", f"Are hardened configuration guidelines documented for all field assets under {fw_name}?", "Service Provider Requirements", 3, "Audit manufacturer documentation for active firewall rule templates and port locks."),
                ("SP 4.2", "Logic Flash Verification", f"Are PLC program hashes verified against master backups after service actions under {fw_name}?", "Service Provider Requirements", 2, "Verify that logic files are checked for unapproved ladder updates post-maintenance."),
                ("SP 5.1", "Service Level Agreement Terms", f"Do integration contracts define security event reporting response times under {fw_name}?", "Service Provider Requirements", 4, "Verify that supplier SLAs mandate immediate notification of supply chain breaches."),
                ("SP 5.2", "Service Program Audit Schedule", f"Are service provider security programs audited by asset owners annually under {fw_name}?", "Service Provider Requirements", 4, "Check third-party program certificates and internal audit logs to confirm ongoing vetting.")
            ]
        elif sub == "4_1":
            return [
                ("SD 1.1", "Security Development Lifecycle", f"Is there a formal secure development lifecycle program established under {fw_name}?", "Product SDL Governance", 4, "Verify that security is integrated into product planning, design, and coding phases."),
                ("SD 1.2", "Secure Architecture Design", f"Are threat modeling and secure design reviews executed for all products under {fw_name}?", "Product SDL Governance", 4, "Audit system architectural reviews and trust boundary mappings in product blueprints."),
                ("SD 2.1", "Secure Coding Guidelines", f"Are secure coding standards (such as MISRA C or OWASP) enforced in code under {fw_name}?", "Secure Design & Development", 3, "Verify compiler options and static analysis tool profiles checking code syntax rules."),
                ("SD 2.2", "Static Code Analysis Vetting", f"Are static analysis scans executed automatically on every code integration under {fw_name}?", "Secure Design & Development", 3, "Audit build pipelines for automated scanning gates flagging buffer overflow risks."),
                ("SD 3.1", "Third-Party Code Vetting", f"Are third-party open source library dependencies scanned for vulnerabilities under {fw_name}?", "Secure Design & Development", 4, "Validate software bill of materials (SBOM) and dependency checkers active in development."),
                ("SD 3.2", "Dynamic Software Testing", f"Is dynamic application security testing (fuzzing) performed before code release under {fw_name}?", "Secure Design & Development", 3, "Verify protocol fuzzing campaigns on PLC web services and Modbus libraries."),
                ("SD 4.1", "Vulnerability Response Program", f"Is there a documented process to receive, evaluate, and patch security bugs under {fw_name}?", "Vulnerability Handling & Vetting", 4, "Check that the developer publishes secure contact details and responds to research alerts."),
                ("SD 4.2", "Remediation Patch Releases", f"Are security hotfixes and remediation patches delivered within 30 days under {fw_name}?", "Vulnerability Handling & Vetting", 2, "Verify delivery and distribution procedures for security vulnerability updates."),
                ("SD 5.1", "Firmware Cryptographic Signing", f"Are product firmware updates digitally signed using highly secure keys under {fw_name}?", "Product SDL Governance", 3, "Verify code signature certificates and hardware security modules protecting update keys."),
                ("SD 5.2", "Product Security User Guides", f"Are product user manuals providing instructions on secure hardening under {fw_name}?", "Product SDL Governance", 3, "Ensure user manuals detail how to disable insecure services and change default passwords.")
            ]

    # INGAA Guidelines detailed custom controls
    if fw_id == "INGAA_GUIDE":
        return [
            ("INGAA-3.2", "Cyber Asset Criticality Vetting", f"Does the operator identify and classify control system cyber assets based on safety, reliability, and business continuity objectives under {fw_name}?", "Asset Classification", 4, "Verify documented procedures for classifying critical vs non-critical cyber assets according to TSA and INGAA pipeline security criteria."),
            ("INGAA-3.3.1.1", "Cyber Asset Physical Access Controls", f"Are physical access controls implemented for all control system cyber assets in accordance with 49 CFR parts 192/193 under {fw_name}?", "Physical Security", 1, "Review building gates, control enclaves, locked cabinets, and physical access locks on PLCs, RTUs, and HMIs at compressor and M&R stations."),
            ("INGAA-3.3.1.2", "Remote Connection Vetting", f"Are remote and third-party network connections used for maintenance and diagnostics securely monitored and periodically reviewed under {fw_name}?", "Remote Connections", 3, "Validate that third-party connections are explicitly authorized, logged, and monitored continuously while active, and disabled when not in use."),
            ("INGAA-3.3.1.3", "Wireless Network Risk Assessment", f"Is a wireless network risk assessment completed before deploying any wireless operational technology at pipeline facilities under {fw_name}?", "Wireless Security", 2, "Verify that the risk assessment weighs operational benefits against exploitation risks and ensures wireless networks are fully secured."),
            ("INGAA-3.3.1.4", "Annual Security Procedures Review", f"Are control system cyber security plans, policies, and procedures reviewed, reassessed, and updated at least annually under {fw_name}?", "Governance", 4, "Confirm that procedures undergo regular annual reviews, with any deviations documented as authorized exceptions."),
            ("INGAA-3.3.1.5", "Criticality Classification Reassessment", f"Is the criticality classification of control system cyber assets reviewed and reassessed at least once every 18 months under {fw_name}?", "Asset Classification", 4, "Check documentation verifying the periodic review and approval of the critical asset list, ensuring alignment with TSA requirements."),
            ("INGAA-3.3.2.1", "Cross-Functional Coordination Process", f"Is there a documented network security coordination process spanning the entire systems development lifecycle (SDLC) under {fw_name}?", "Security Coordination", 4, "Audit coordination between IT, OT, and business groups during strategic planning, design, acquisition, testing, installation, and retirement."),
            ("INGAA-3.3.2.2", "Roles & Communication Lines", f"Are cyber security roles, responsibilities, and bi-directional lines of communication formally defined and documented under {fw_name}?", "Security Coordination", 4, "Check roles and lines of communication among operations staff, IT, partners, and contractors, including verification of their effectiveness."),
            ("INGAA-3.3.2.3.1", "Procurement Hardening Standards", f"Do procurement specifications incorporate system hardening, perimeter protection, and account management requirements under {fw_name}?", "Procurement", 4, "Verify that the acquisition policy encourages vendors to follow secure coding, flaw remediation, and malware detection standards."),
            ("INGAA-3.3.2.3.2", "Services Procurement Security", f"Are control system service providers contractually required to employ security controls in accordance with directives and SLAs under {fw_name}?", "Procurement", 4, "Audit third-party service provider contracts to confirm they define user roles, restrict access, and monitor compliance."),
            ("INGAA-3.3.3.1.1", "Secure System Design", f"Do control system designs prohibit embedding clear-text passwords in source code, scripts, aliases, or shortcuts under {fw_name}?", "System Lifecycle", 3, "Ensure all source code is secured to prevent unauthorized viewing/modification, and that workstations are restricted to approved control activities."),
            ("INGAA-3.3.3.1.2", "Least Privilege & Access Rights", f"Does the cyber system grant only the minimum set of rights and privileges required to perform control, maintenance, or monitoring under {fw_name}?", "System Lifecycle", 3, "Confirm that role-based access control applies to physical access, OS services, files, disks, shared data, and network resources."),
            ("INGAA-3.3.3.2.1", "Control System Hardening", f"Are configurations for network devices (firewalls, routers, switches) baselined and hardened by disabling unused ports/protocols under {fw_name}?", "System Hardening", 2, "Verify that unneeded OS services (e.g. FTP, Telnet) are disabled, guest accounts are removed, and default passwords are changed."),
            ("INGAA-3.3.3.2.2", "Software Patches & Antivirus", f"Are critical application and database security patches and antivirus definitions inventoried and applied regularly under {fw_name}?", "System Hardening", 2, "Audit patch levels, antivirus update logs, and supplier patch recommendations to ensure systematic mitigation of software vulnerabilities."),
            ("INGAA-3.3.3.3", "Change Control Baselines", f"Is a formal change control process implemented to evaluate, test, and document all permanent and temporary system changes under {fw_name}?", "Change Control", 3, "Verify baseline configurations are fully documented to a level that allows restore, and check impact analysis records before deployment."),
            ("INGAA-3.3.3.4", "Media Sanitization & Disposal", f"Are there policies and procedures to sanitize both digital and non-digital media prior to disposal or reuse under {fw_name}?", "System Lifecycle", 2, "Validate that scrubbing or physical destruction processes make it impossible to retrieve or reconstruct sensitive information."),
            ("INGAA-3.3.4.1", "Control Systems Recovery Planning", f"Is a comprehensive restoration and recovery plan documented to handle cyber threats, disasters, and equipment failures under {fw_name}?", "System Restoration", 4, "Confirm the plan defines roles, backup restoration procedures, and emergency contact lists including vendors and network administrators."),
            ("INGAA-3.3.4.2", "Tested Restoration Processes", f"Are backups of critical SCADA software, applications, data, and configurations secured and tested periodically under {fw_name}?", "System Restoration", 3, "Review backup logs, secure offsite storage paths, and test reports verifying that backup configurations can be restored successfully."),
            ("INGAA-3.3.5.1", "Cyber Intrusion Monitoring & Logs", f"Are system logs and network traffic monitored continuously for unexpected log events, high CPU, or unauthorized accounts under {fw_name}?", "Intrusion Monitoring", 2, "Ensure centralized monitoring tracks log files, disk space exhaustion, locked accounts, unexpected patches, or outside IP connections."),
            ("INGAA-3.3.5.2", "Incident Response & Tabletop Drills", f"Is an incident response plan active, establishing clear triage, alert, response, recovery, and lessons-learned phases under {fw_name}?", "Incident Handling", 4, "Audit annual tabletop exercises, scenario checklists, post-mortem reviews, and the formal process for declaring security incidents."),
            ("INGAA-3.3.5.3", "Secure Log Storage & Reporting", f"Are event log files secured against modification and retained for regulatory audits and incident investigations? under {fw_name}?", "Incident Handling", 2, "Verify that logs are protected from tampering and archived, and check reporting procedures for notifying CISA, TSA, or regional bodies."),
            ("INGAA-3.3.6.1", "Security Awareness Training", f"Do all control systems users receive security awareness training prior to being granted access and annually thereafter under {fw_name}?", "Personnel Training", 4, "Verify training covers compliance, password rules, malicious code protection, social engineering, and change control procedures."),
            ("INGAA-3.3.6.2", "Role-Specific Security Training", f"Do individuals with significant control systems security roles receive specialized technical and operational training under {fw_name}?", "Personnel Training", 4, "Check training records on firewalls, GPOs, access control enforcement, incident response, and vulnerability assessment."),
            ("INGAA-3.3.7.1.1", "Control System Network Segregation", f"Is the control systems network segregated from the corporate network and the Internet using firewalls, VLANs, and ACLs under {fw_name}?", "Network Segregation", 3, "Review network topologies to verify segregation, accounting for minimum bandwidth, redundancy, and packet latency."),
            ("INGAA-3.3.7.1.2", "SCADA and Data Center Segmentation", f"Are there minimal, documented, and firewalled access points between the production SCADA network and the corporate network under {fw_name}?", "Network Segregation", 3, "Verify that boundary firewalls explicitly authorize only required incoming/outgoing traffic, deny ICMP, and stream connection timeouts."),
            ("INGAA-3.3.7.2.2", "Logical Access Control Enforcement", f"Are access controls enforced to ensure only authorized workstations connect to the network and unique passwords protect all devices under {fw_name}?", "Access Enforcement", 3, "Audit user provisioning approvals, unique human logins, disabled third-party connections when not in use, and changed default vendor credentials."),
            ("INGAA-3.4.1.2", "Enhanced Logical Access Controls", f"Are enhanced access controls (such as multi-factor authentication and role segmentation) active for critical assets under {fw_name}?", "Enhanced Measures", 3, "Verify MFA controls, separation of duties, and role-based permissions (viewer, gas controller, system administrator) on critical pipeline controllers."),
            ("INGAA-3.4.2", "Security Vulnerability Assessments", f"Are periodic Security Vulnerability Assessments (SVAs) conducted on a non-production testbed at least once every 36 months under {fw_name}?", "Enhanced Measures", 4, "Confirm that SVAs include vulnerability scans, threat source analysis, and residual risk calculations reviewed by subject matter experts.")
        ]

    # PCI DSS detailed custom requirements
    if fw_id == "PCI_DSS":
        return [
            ("REQ 1.1", "CDE Segment Firewall", f"Are firewalls placed at CDE boundary interfaces under {fw_name}?", "Build & Maintain Secure Network", 3, "Verify firewall rules isolating cardholder data environments from office networks."),
            ("REQ 1.2", "CDE Network Diagram", f"Is a current, detailed CDE network topology diagram maintained under {fw_name}?", "Build & Maintain Secure Network", 3, "Check that a diagram shows all connections to cardholder database servers."),
            ("REQ 2.1", "Default Account Disabling", f"Are manufacturer default credentials and configurations changed under {fw_name}?", "Build & Maintain Secure Network", 2, "Ensure vendor passwords, default accounts, and wireless names are completely disabled."),
            ("REQ 3.1", "PAN Encryption at Rest", f"Is primary account number (PAN) storage encrypted at rest under {fw_name}?", "Protect Cardholder Data", 3, "Verify strong AES-256 or RSA cryptographic encryption protecting cardholder records."),
            ("REQ 3.2", "PAN Account Masking", f"Is PAN display masked showing only the last four digits under {fw_name}?", "Protect Cardholder Data", 3, "Verify database and UI masking features on CDE client terminals."),
            ("REQ 4.1", "PAN Encryption in Transit", f"Is CDE telemetry encrypted using strong tunnels during public transit under {fw_name}?", "Protect Cardholder Data", 3, "Ensure SSL/TLS 1.3 or IPsec tunnels protect CDE traffic crossing public networks."),
            ("REQ 5.1", "Endpoint Antivirus Sweeps", f"Are active antivirus definitions updated daily on CDE endpoints under {fw_name}?", "Vulnerability Management Program", 2, "Verify configuration sweeps and update logs for anti-malware tools."),
            ("REQ 6.1", "Patch Flaw Remediation", f"Are critical software hotfixes deployed within 30 days of release under {fw_name}?", "Vulnerability Management Program", 2, "Audit patch schedules and vulnerability scan sweeps for active CDE hosts."),
            ("REQ 7.1", "CDE Access Least Privilege", f"Is CDE database access restricted using strict role-based privilege under {fw_name}?", "Implement Strong Access Control", 3, "Audit active directory groups and DB permissions to restrict access to authorized roles."),
            ("REQ 8.1", "Unique Human Accounts", f"Are unique logical accounts assigned to all CDE operators under {fw_name}?", "Implement Strong Access Control", 3, "Verify that shared accounts and default logins are completely disabled."),
            ("REQ 8.2", "MFA Administrative Gates", f"Is multi-factor authentication enforced for all external remote CDE access under {fw_name}?", "Implement Strong Access Control", 3, "Validate MFA configurations for operations VPNs and technician sessions."),
            ("REQ 10.1", "Syslog Audit Logging", f"Are event logs aggregated continuously, capturing CDE logins under {fw_name}?", "Regularly Monitor & Test Networks", 2, "Verify that logs record user, timestamp, command, and outcomes in a secure buffer.")
        ]

    # SOC 2 detailed custom Trust Services Criteria
    if fw_id == "SOC_2":
        return [
            ("CC 1.1", "Ethical Integrity Values", f"Does the organization publish and enforce a formal code of ethical conduct under {fw_name}?", "Security (Common Criteria)", 4, "Verify corporate commitment, whistleblower lines, and code of conduct reviews."),
            ("CC 2.1", "Security Governance Board", f"Are security policies reviewed, signed, and updated annually by executive staff under {fw_name}?", "Security (Common Criteria)", 4, "Ensure systematic review of governance controls to satisfy security objectives."),
            ("CC 3.1", "Risk Assessment Matrix", f"Are active risk assessments executed annually to identify threat vectors under {fw_name}?", "Security (Common Criteria)", 4, "Audit risk assessment matrices tracking impact and likelihood scores for corporate networks."),
            ("CC 4.1", "Vendor Auditing Program", f"Are third-party suppliers and subprocessors audited for security compliance under {fw_name}?", "Security (Common Criteria)", 4, "Validate supply chain risk reviews and integration contract clauses for service providers."),
            ("CC 5.1", "Access Authorization Revocation", f"Are access privileges revoked immediately upon employee offboarding under {fw_name}?", "Security (Common Criteria)", 3, "Check that pre-employment screening and annual vetting rules are active for staff."),
            ("CC 6.1", "Logical Perimeter Filters", f"Are active logical boundary perimeters (firewalls, VPC security groups) deployed under {fw_name}?", "Security (Common Criteria)", 3, "Audit edge router filtering tables and zone communication blocks to isolate databases."),
            ("CC 6.2", "MFA Administrative Gates", f"Is multi-factor authentication enforced for all employee administrative terminals under {fw_name}?", "Security (Common Criteria)", 3, "Check MFA settings for external vendor tunnels and employee admin logins."),
            ("CC 6.3", "Unique Operator Logins", f"Are unique credentials assigned to all operators, completely avoiding shared accounts under {fw_name}?", "Security (Common Criteria)", 3, "Verify logical credential policy updates and authentication enforcement gates."),
            ("CC 7.1", "Intrusion Threat Alerting", f"Are passive IDS/IPS systems active to detect rogue packet signatures under {fw_name}?", "Security (Common Criteria)", 3, "Ensure passive network security monitors flag anomalous packet structures in real-time."),
            ("CC 7.2", "Vulnerability Patch Cycle", f"Are system dependencies scanned weekly and critical patches applied monthly under {fw_name}?", "Security (Common Criteria)", 2, "Audit patch testing processes to prevent introduction of software bugs to active databases.")
        ]

    # ISO 27001 detailed Annex A rules
    if fw_id == "ISO_27001":
        return [
            ("A.5.1", "Policies for Info Security", f"Are documented information security policies reviewed and updated annually under {fw_name}?", "Organizational Security Controls", 4, "Verify corporate commitment, budgets, and charter for the information security program."),
            ("A.5.2", "Information Security Roles", f"Are roles and responsibilities for system security clearly defined and assigned under {fw_name}?", "Organizational Security Controls", 4, "Ensure roles, responsibilities, and reporting escalations are defined for security analysts."),
            ("A.5.3", "Contact with Authorities", f"Is a contact list for law enforcement and emergency response maintained under {fw_name}?", "Organizational Security Controls", 4, "Check reporting escalations and emergency communications directories."),
            ("A.6.1", "Screening and Backgrounds", f"Are screening verification checks performed for all employees and contractors under {fw_name}?", "People Security Controls", 4, "Audit pre-employment screening processes and background search history."),
            ("A.6.2", "Employment Security Vetting", f"Are employee confidentiality agreements signed before granting database access under {fw_name}?", "People Security Controls", 4, "Ensure legal contracts are filed before assigning database credentials."),
            ("A.6.3", "Security Training Awareness", f"Do employees receive regular cybersecurity awareness training and updates under {fw_name}?", "People Security Controls", 4, "Verify systematic training programs and testing trackers for personnel."),
            ("A.7.1", "Physical Security Perimeter", f"Are physical facility gates protected using badge scanners and CCTV under {fw_name}?", "Physical Security Controls", 3, "Check physical facility perimeters, control rooms, and equipment enclaves."),
            ("A.7.2", "Enclosure Hardware Locking", f"Are hardware cabinets, switchboards, and servers physically locked under {fw_name}?", "Physical Security Controls", 3, "Ensure server rack doors and local diagnostic panels are locked."),
            ("A.8.1", "Endpoint Terminal Hardening", f"Are default vendor credentials and unnecessary services disabled under {fw_name}?", "Technological Security Controls", 2, "Verify that default switch accounts and unnecessary network daemons are disabled."),
            ("A.8.2", "Access Authorization Controls", f"Are unique user accounts assigned, strictly avoiding shared accounts under {fw_name}?", "Technological Security Controls", 3, "Verify user account provisioning records and access profiles."),
            ("A.8.3", "MFA Administrative Remote Access", f"Is multi-factor authentication enforced for all external administrative access under {fw_name}?", "Technological Security Controls", 3, "Audit MFA configuration settings for remote administrative connections."),
            ("A.8.4", "Boundary Network Firewall", f"Are firewalls configured to segment operations networks from business LANs under {fw_name}?", "Technological Security Controls", 3, "Audit network boundary filters and routing segregation tables.")
        ]

    # COBIT 2019 detailed custom rules
    if fw_id == "COBIT_2019":
        return [
            ("EDM01.01", "Governance Framework Design", f"Is the corporate governance framework aligned with business strategy under {fw_name}?", "Evaluate, Direct & Monitor (EDM)", 4, "Audit corporate alignment policies, leadership charters, and IT oversight boards."),
            ("EDM02.01", "Value Optimization Focus", f"Are IT investments evaluated for business value optimization under {fw_name}?", "Evaluate, Direct & Monitor (EDM)", 4, "Verify budget optimization strategies and IT value monitoring frameworks."),
            ("EDM03.01", "Risk Governance Limits", f"Are risk tolerance limits defined and monitored by the executive board under {fw_name}?", "Evaluate, Direct & Monitor (EDM)", 4, "Check risk matrix updates, vulnerability response limits, and policy compliance boards."),
            ("APO01.01", "IT Management Alignment", f"Is the IT management framework documented and reviewed annually under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Ensure IT charter, roles, and administrative hierarchies are documented."),
            ("APO02.01", "IT Strategic Roadmap", f"Is a clear strategic IT roadmap maintained showing security integration under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Verify multi-year technical improvement programs and security alignment."),
            ("APO03.01", "Enterprise Architecture Map", f"Are operational networks and corporate assets formally mapped in architecture under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Audit database assets and system boundaries in the central repository."),
            ("APO04.01", "Innovation Management Vetting", f"Are security risk reviews performed for all incoming innovative systems under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Ensure technical assessments occur before new service commissioning."),
            ("APO05.01", "IT Portfolio Optimization", f"Is the system portfolio audited regularly to locate security gaps under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Audit legacy devices and unsupported operating system trackers."),
            ("APO06.01", "Budget and Cost Governance", f"Are security budgets tracked and optimized across projects under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Verify project cost trackers and compliance resource allocations."),
            ("APO07.01", "Personnel Skills Training", f"Do systems engineers undergo annual security skills development under {fw_name}?", "Align, Plan & Organize (APO)", 4, "Verify training catalog updates and engineer capability assessments.")
        ]

    # CIS Controls v8 detailed custom rules
    if fw_id == "CIS_CONTROLS":
        return [
            ("CIS-1.1", "Enterprise Hardware Inventory", f"Is a detailed, automated hardware asset inventory maintained under {fw_name}?", "Inventory & Control of Assets", 3, "Verify network scans and inventory lists of active field controllers."),
            ("CIS-2.1", "Authorized Software Inventory", f"Is an authorized software registry active on all systems under {fw_name}?", "Inventory & Control of Assets", 3, "Audit software execution registries and software whitelisting setups."),
            ("CIS-3.1", "Data Classification Matrix", f"Is customer and operational data classified by risk levels under {fw_name}?", "Inventory & Control of Assets", 3, "Verify storage sensitivity labels protecting design files."),
            ("CIS-4.1", "Secure Network Baselines", f"Are secure configurations established and documented for all switches under {fw_name}?", "Inventory & Control of Assets", 3, "Verify baseline configuration tracking for all active network units."),
            ("CIS-5.1", "Unique Human Credentials", f"Are unique accounts assigned to all users, avoiding shared logins under {fw_name}?", "Data & Software Security", 3, "Check Active Directory permissions and account setup lists."),
            ("CIS-6.1", "Multi-Factor Authentication", f"Is MFA enforced for all administrative and external remote VPNs under {fw_name}?", "Data & Software Security", 3, "Verify MFA config on the central authentication server."),
            ("CIS-7.1", "Endpoint Malware Detection", f"Are active anti-malware programs installed on all endpoints under {fw_name}?", "Data & Software Security", 3, "Ensure daily malware signature scans are logged regularly."),
            ("CIS-8.1", "Sandbox Patch Validation", f"Are patch validation tests executed in sandboxes before active deployment under {fw_name}?", "Data & Software Security", 3, "Verify patch compatibility laboratory dry runs."),
            ("CIS-9.1", "Syslog Trace Collection", f"Are audit logs recorded continuously with accurate timestamps under {fw_name}?", "Secure Configurations & Access", 3, "Verify time sync settings and continuous logging loops."),
            ("CIS-10.1", "Contingency Recovery Backups", f"Are daily backups encrypted and stored offline in secure cabinets under {fw_name}?", "Secure Configurations & Access", 3, "Check fireproof safes and offsite storage schedules."),
            ("CIS-11.1", "Log Security Storage", f"Are trace logs stored in a secure secondary segment to prevent tampering under {fw_name}?", "Secure Configurations & Access", 3, "Ensure syslog servers are logically isolated from corporate units."),
            ("CIS-12.1", "Zone Firewall Separation", f"Are operational segments isolated from business LANs using firewalls under {fw_name}?", "Secure Configurations & Access", 3, "Audit network boundary filters and routing tables."),
            ("CIS-13.1", "Transmission Tunnel Encryption", f"Is data encrypted using TLS 1.3 tunnels during transit under {fw_name}?", "Secure Configurations & Access", 3, "Audit secure web transport certificates and session encrypt settings."),
            ("CIS-14.1", "Employee Security Awareness", f"Do employees receive regular cybersecurity awareness training under {fw_name}?", "Continuous Vulnerability & Monitoring", 3, "Verify basic phishing and social engineering training records."),
            ("CIS-15.1", "Third-Party Risk Vetting", f"Are vendor integrations assessed and audited for security compliance under {fw_name}?", "Continuous Vulnerability & Monitoring", 3, "Verify supplier risk questionnaires and validation checks."),
            ("CIS-16.1", "Port Logically Lockout", f"Are unused physical interfaces and ports disabled on switches under {fw_name}?", "Continuous Vulnerability & Monitoring", 3, "Verify that unallocated slots are disabled in active switches."),
            ("CIS-17.1", "Incident Response Plan", f"Is an incident response plan active, defining containment actions under {fw_name}?", "Incident Response & Disaster Recovery", 3, "Audit emergency playbook updates and call-tree contact details."),
            ("CIS-18.1", "Physical Perimeter Barrier", f"Are hardware cabinets and server racks locked inside cages under {fw_name}?", "Incident Response & Disaster Recovery", 3, "Check that physical server enclaves require badged entry.")
        ]

    # Water sector
    if sector == "Water" or category == "Water & Wastewater" or "EPA_" in fw_id or "AWWA" in fw_id:
        return [
            ("WAT-1.1", "Water Security Policy", f"Is there a formal water security policy reviewed and signed annually under {fw_name}?", "Water Security Governance", 4),
            ("WAT-1.2", "Operator Background Check", f"Are criminal background checks executed for all plant operators under {fw_name}?", "Water Security Governance", 4),
            ("WAT-1.3", "Critical Chemical Dosing Isolation", f"Are chemical dosing PLCs logically isolated from enterprise networks under {fw_name}?", "Water Security Governance", 4),
            ("WAT-1.4", "Purdue Level 3 Boundary Firewall", f"Are Level 3 operations networks separated from Level 4 office LANs under {fw_name}?", "Water Security Governance", 4),
            ("WAT-2.1", "Default Credential Lockdown", f"Are factory default passwords and services disabled on PLCs under {fw_name}?", "Chemical Dosing & Flow Control Protection", 3),
            ("WAT-2.2", "Switch Physical Port Lock", f"Are unused port jacks locked inside secure control panels under {fw_name}?", "Chemical Dosing & Flow Control Protection", 3),
            ("WAT-2.3", "Dosing PLC Firmware Hash", f"Are logic firmware hashes verified before applying changes under {fw_name}?", "Chemical Dosing & Flow Control Protection", 3),
            ("WAT-2.4", "MFA Remote Engineering Access", f"Is multi-factor authentication required for external engineering VPNs under {fw_name}?", "Chemical Dosing & Flow Control Protection", 3),
            ("WAT-3.1", "Continuous SCADA Syslog", f"Are operator adjustments on chemical feeds logged continuously under {fw_name}?", "Pumping & SCADA Operations Security", 3),
            ("WAT-3.2", "Syslog Tamper-Proof WORM", f"Are SCADA event logs stored in isolated segments under {fw_name}?", "Pumping & SCADA Operations Security", 3)
        ]

    # 2. Defense Sector
    elif sector == "Defense" or category == "Defense & Aerospace" or "CMMC" in fw_id or "CNSSI" in fw_id or "NNSA" in fw_id or "NIST_800_17" in fw_id:
        raw_blueprints = [
            ("DEF-1.1", "CUI Data Encryption", f"Is Controlled Unclassified Information (CUI) encrypted at rest using FIPS 140-2 validated modules under {fw_name}?", "Controlled Unclassified Information (CUI) Protection", 3),
            ("DEF-1.2", "Authorized Build Pipeline", f"Are only digitally signed and vetted software packages permitted in the {fw_name} build chain?", "Controlled Unclassified Information (CUI) Protection", 3),
            ("DEF-2.1", "FIDO2 Hardware Tokens", f"Are human access controls enforced using physical FIDO2 tokens or PIV cards under {fw_name}?", "Identity Verification & Multi-Factor Access", 4),
            ("DEF-2.2", "Engineering session Lockouts", f"Do engineering workstation active sessions lock automatically after 5 minutes of idle state under {fw_name}?", "Identity Verification & Multi-Factor Access", 4),
            ("DEF-3.1", "APT Threat Hunting", f"Are weekly proactive threat-hunting exercises performed to locate stealthy indicators of compromise under {fw_name}?", "Advanced Persistent Threat (APT) Defenses", 4),
            ("DEF-3.2", "Isolated Source Code Controls", f"Are git source repositories isolated on dedicated networks with multi-factor check-in gates under {fw_name}?", "Advanced Persistent Threat (APT) Defenses", 4),
            ("DEF-4.1", "Biometric Facility Enclaves", f"Are engineering laboratories and server racks protected by dual-factor biometric access locks under {fw_name}?", "Physical Facility Enclave Security", 4),
            ("DEF-4.2", "Supplier Audit Program", f"Are external hardware and software suppliers audited for CMMC and {fw_name} compliance?", "Physical Facility Enclave Security", 4),
            ("DEF-4.3", "ESP Boundary Separation", f"Are CUI processing networks segmented from corporate business units under {fw_name}?", "Advanced Persistent Threat (APT) Defenses", 4),
            ("DEF-4.4", "Incident Recovery Vault", f"Are daily configurations archived and stored in an offline fireproof safe under {fw_name}?", "Controlled Unclassified Information (CUI) Protection", 3)
        ]
    # 3. Transport Sector
    elif sector == "Transport" or category == "Transportation" or "TSA_" in fw_id or "FAA_" in fw_id or "USCG_" in fw_id or "DO_326" in fw_id:
        raw_blueprints = [
            ("TRN-1.1", "Avionics Bus Isolation", f"Are critical avionics control buses logically and physically separated from passenger networks under {fw_name}?", "Avionics & Telemetry Control Safety", 3),
            ("TRN-1.2", "Radars Diagnostic encryption", f"Are diagnostic radar communications and ground control links encrypted under {fw_name}?", "Avionics & Telemetry Control Safety", 3),
            ("TRN-2.1", "Marine Ship-to-Shore separation", f"Are shipboard control segments completely isolated from shore administrative connections under {fw_name}?", "Electronic Security Boundaries", 4),
            ("TRN-2.2", "Pipeline compressor DMZ", f"Are pipeline compressor SCADA terminals separated from corporate LANs using an operational DMZ under {fw_name}?", "Electronic Security Boundaries", 4),
            ("TRN-3.1", "DNP3 Secure Link Encrypt", f"Are DNP3 Secure or custom IPSec tunnels enforced for all telemetry crossing public networks under {fw_name}?", "Ship-to-Shore Network Isolation", 3),
            ("TRN-3.2", "Modbus Packet Firewalls", f"Are boundary switches configured to filter raw Modbus TCP commands using strict firewall rules under {fw_name}?", "Ship-to-Shore Network Isolation", 3),
            ("TRN-4.1", "Substation emergency override plan", f"Is there a tested operational plan enabling operators to manually shut down valves and switches under {fw_name}?", "Incident Continuity & Threat Alerts", 3),
            ("TRN-4.2", "TSA Threat Bulletin patches", f"Are security alerts and vendor vulnerability bulletins acted upon within 14 days under {fw_name}?", "Incident Continuity & Threat Alerts", 3),
            ("TRN-4.3", "Workstation Idle Timeout", f"Do terminal active sessions lock automatically after 10 minutes under {fw_name}?", "Avionics & Telemetry Control Safety", 3),
            ("TRN-4.4", "Substation Card Readers", f"Are physical access gates and CCTV surveillance active at all substation enclaves under {fw_name}?", "Electronic Security Boundaries", 4)
        ]
    # 4. Chemical Sector
    elif sector == "Chemical" or category == "Chemical Operations" or "CFATS" in fw_id:
        raw_blueprints = [
            ("CHM-1.1", "Physical Enclosure Contact Alarms", f"Are HMI cabinets and server enclosures fitted with electronic contact alarms under {fw_name}?", "Physical Access Barriers & Cabinets", 3),
            ("CHM-1.2", "NEMA steel enclosure locks", f"Are raw PLC units locked inside industrial-grade NEMA enclosures fitted with key card gates under {fw_name}?", "Physical Access Barriers & Cabinets", 3),
            ("CHM-2.1", "Localized Emergency Dump Valve", f"Can the chemical mixing loops transition immediately to local manual dump valves under {fw_name}?", "Hazardous Mixing SCADA Safety", 4),
            ("CHM-2.2", "Isolated safety loop air-gaps", f"Are Safety Instrumented Systems (SIS) physically air-gapped from active operations networks under {fw_name}?", "Hazardous Mixing SCADA Safety", 4),
            ("CHM-3.1", "Real-time telemetry signature logs", f"Are all operator feed adjustments logged continuously onto write-once storage under {fw_name}?", "Asset Tracking & Inventory Security", 3),
            ("CHM-3.2", "Passive intrusion packet alarms", f"Are passive IDS alert alarms configured to flag rogue telemetry commands under {fw_name}?", "Asset Tracking & Inventory Security", 3),
            ("CHM-4.1", "Annual emergency evacuation drills", f"Are chemical leak emergency tabletop drills executed annually with regional responders under {fw_name}?", "Crisis Action & Emergency Tabletops", 3),
            ("CHM-4.2", "Encrypted offline backup storage", f"Are daily backups of SCADA databases and RTU configuration files stored in fireproof offsite safes under {fw_name}?", "Crisis Action & Emergency Tabletops", 3),
            ("CHM-4.3", "Operator Account Access Rules", f"Are engineering setpoint modifications restricted to certified operator roles under {fw_name}?", "Physical Access Barriers & Cabinets", 3),
            ("CHM-4.4", "Supplier Software Risk Vetting", f"Are digital signatures and software hashes validated for all vendor logic updates under {fw_name}?", "Crisis Action & Emergency Tabletops", 3)
        ]
    # 5. Nuclear Sector
    elif sector == "Nuclear" or category == "Nuclear Operations" or "NRC_RG" in fw_id or "IAEA_NSS" in fw_id:
        raw_blueprints = [
            ("NUC-1.1", "Reactor core telemetry air-gapping", f"Are reactor core safety systems physically air-gapped from all networking equipment under {fw_name}?", "Reactor Core Instrumentation Safety", 4),
            ("NUC-1.2", "Hardware unidirectional data diodes", f"Are unidirectional data diodes enforced for outbound reactor core diagnostics under {fw_name}?", "Reactor Core Instrumentation Safety", 4),
            ("NUC-2.1", "Control Room electronic perimeter", f"Is a secure electronic perimeter constructed surrounding the main control room under {fw_name}?", "Substation & Control Air-Gapping", 4),
            ("NUC-2.2", "Purdue Level 3 logical isolation", f"Are Levels 0-3 control networks completely isolated from Level 4 office segments under {fw_name}?", "Substation & Control Air-Gapping", 4),
            ("NUC-3.1", "Biometric dual-factor access gates", f"Are server cabins and control panels protected by dual-factor biometric access locks under {fw_name}?", "Physical Biometric Enclaves", 4),
            ("NUC-3.2", "NEMA steel enclosure alarms", f"Are hardware enclosures fitted with active door contact alarms under {fw_name}?", "Physical Biometric Enclaves", 4),
            ("NUC-4.1", "Dual-operator signature logic updates", f"Are dual-operator signatures required before loading logic updates onto active controllers under {fw_name}?", "Dual-Signature Logic Auditing", 4),
            ("NUC-4.2", "Firmware static code validation", f"Are firmware programs validated using rigorous static analysis before flashing under {fw_name}?", "Dual-Signature Logic Auditing", 4),
            ("NUC-4.3", "Log WORM Segment Isolation", f"Are audit logs stored in a secure secondary segment immune to ransomware under {fw_name}?", "Substation & Control Air-Gapping", 4),
            ("NUC-4.4", "Supplier SCRM Vetting Checks", f"Are security risk audits executed for all grid hardware and software procurement under {fw_name}?", "Dual-Signature Logic Auditing", 4)
        ]
    # 6. Finance Sector
    elif sector == "Finance" or category == "Finance Operations" or "SWIFT" in fw_id or "CRI_PROFILE" in fw_id:
        raw_blueprints = [
            ("FIN-1.1", "Secure CDE gateway firewalls", f"Are firewalls configured to completely isolate CDE networks from office LANs under {fw_name}?", "Secure Transaction Routing", 3),
            ("FIN-1.2", "Endpoint terminal secure configurations", f"Are merchant gateway terminals hardened by removing unnecessary services and default logins under {fw_name}?", "Secure Transaction Routing", 3),
            ("FIN-2.1", "ATM segment boundary segregation", f"Are ATM networks isolated in dedicated subnets with active flow filtering under {fw_name}?", "Endpoint Terminal Hardening", 3),
            ("FIN-2.2", "MFA administrative remote VPNs", f"Is multi-factor authentication enforced for all external administrative access to {fw_name} systems?", "Endpoint Terminal Hardening", 4),
            ("FIN-3.1", "Transaction velocity threshold alerts", f"Are alerts configured for anomalous spikes in transaction velocity or value under {fw_name}?", "Continuous Velocity Monitoring", 3),
            ("FIN-3.2", "Syslog user audit tracking", f"Are all operator actions logged continuously with precise, synchronized timestamps under {fw_name}?", "Continuous Velocity Monitoring", 3),
            ("FIN-4.1", "Quarterly external vulnerability scans", f"Are quarterly vulnerability scans executed by certified scanning vendors under {fw_name}?", "Vulnerability Assessment & Vetting", 4),
            ("FIN-4.2", "Supplier security risk audits", f"Are third-party vendor integrations audited for security compliance under {fw_name}?", "Vulnerability Assessment & Vetting", 4),
            ("FIN-4.3", "PAN Masks for Account Numbers", f"Is primary account number (PAN) display masked, showing only the last four digits under {fw_name}?", "Secure Transaction Routing", 3),
            ("FIN-4.4", "Syslog WORM Database Segment", f"Are event logs stored in isolated segments to prevent unauthorized tampering under {fw_name}?", "Continuous Velocity Monitoring", 3)
        ]
    # 7. General Fallback
    else:
        raw_blueprints = [
            ("GEN-1.1", "Access setpoint controls", f"Are engineering setpoint modifications restricted to certified operator roles under {fw_name}?", "Access Control & Identity", 3),
            ("GEN-1.2", "Administrative session timeout", f"Is administrative inactive session termination set to auto-lockout within 10 minutes under {fw_name}?", "Access Control & Identity", 3),
            ("GEN-1.3", "Unique cryptographic credentials", f"Are unique cryptographic credentials assigned to all human users and diagnostics ports under {fw_name}?", "Access Control & Identity", 2),
            ("GEN-1.4", "MFA administrative remote access", f"Is multi-factor authentication enforced for all external and remote administration VPNs under {fw_name}?", "Access Control & Identity", 4),
            ("GEN-2.1", "Operational DMZ segment", f"Is an Operational DMZ deployed to segment Levels 3 and 4 network communications under {fw_name}?", "Boundary Protection & Network Segmentation", 3),
            ("GEN-2.2", "Safety-critical loop air-gaps", f"Are unidirectional data diodes or physical air-gaps implemented for safety-critical loops under {fw_name}?", "Boundary Protection & Network Segmentation", 1),
            ("GEN-2.3", "Electronic perimeter flow filters", f"Is active network flow filtering configured at all electronic security perimeters under {fw_name}?", "Boundary Protection & Network Segmentation", 4),
            ("GEN-2.4", "Wireless network segment", f"Are wireless transceivers isolated in dedicated subnets and encrypted with WPA3 under {fw_name}?", "Boundary Protection & Network Segmentation", 3),
            ("GEN-3.1", "Setpoint change recording", f"Are HMI operator setpoint changes recorded continuously on write-once storage under {fw_name}?", "Audit Trails & Security Logging", 2),
            ("GEN-3.2", "NTP synchronization offset", f"Are all system logs synchronized using secure NTP servers with verified time offsets under {fw_name}?", "Audit Trails & Security Logging", 2)
        ]

    # Generate custom descriptions for each blueprint control to completely bypass normalization
    questions = []
    for code, q_name, text, cat, level in raw_blueprints:
        desc = f"Verify compliance against {fw_name} requirements for {q_name.lower()}. Check standard parameters, local interfaces, stakeholder logs, and enclosure access locks."
        questions.append({
            "id": f"question:{fw_id}_{code.replace(' ', '_').replace('.', '_').replace('-', '_')}",
            "regulation_id": f"regulation:{fw_id}",
            "standard_code": code,
            "question_text": text,
            "description": desc,
            "purdue_level": level,
            "category": cat
        })
    return questions

def generate_questions(fw):
    fw_id = fw["id"]
    fw_name = fw["name"]
    category = fw["category"]
    sector = fw["sector"]
    
    # 1. Try dynamic catalog lookup first to avoid truncation and ensure complete mapping
    if fw_id in CSET_CATALOG_DATA:
        questions = []
        for item in CSET_CATALOG_DATA[fw_id]:
            code, q_name, text, cat, level, description = item
            questions.append({
                "id": f"question:{fw_id}_{code.replace(' ', '_').replace('.', '_').replace('-', '_')}",
                "regulation_id": f"regulation:{fw_id}",
                "standard_code": code,
                "question_text": text or f"Is {fw_name} control {code} fully implemented?",
                "description": description or text or f"Verify compliance.",
                "purdue_level": level,
                "category": cat or "General",
                "_source_file": "individual JSON blueprint"
            })
        return questions
        
    # 2. Try parsing authentic CSET database tables first
    try:
        cset_qs = get_cset_parsed_questions(fw)
        if cset_qs:
            return cset_qs
    except Exception as e:
        print(f"Error parsing CSET questions for {fw_id}: {e}")
        
    # 2. Secondary fallbacks to online OSCAL for NIST frameworks
    if fw_id == "NIST_800_53":
        try:
            return fetch_nist_800_53_controls(fw_name)
        except Exception as e:
            print(f"Error fetching online NIST 800-53 catalog: {e}")
        
    if fw_id == "NIST_800_82":
        try:
            return fetch_nist_800_82_controls(fw_name)
        except Exception as e:
            print(f"Error fetching online NIST 800-82 catalog: {e}")
        
    # 3. Fallback to bespoke blueprint questions
    blueprint_res = get_bespoke_blueprint(fw)
    
    questions = []
    for item in blueprint_res:
        if isinstance(item, tuple) or isinstance(item, list):
            code = item[0]
            q_name = item[1]
            text = item[2]
            cat = item[3]
            level = item[4]
            
            if len(item) >= 6:
                desc = item[5]
            else:
                desc = f"Verify compliance against {fw_name} requirements for {q_name.lower()}. Check standard parameters, local interfaces, stakeholder logs, and enclosure access locks."
                
            questions.append({
                "id": f"question:{fw_id}_{code.replace(' ', '_').replace('.', '_').replace('-', '_')}",
                "regulation_id": f"regulation:{fw_id}",
                "standard_code": code,
                "question_text": text,
                "description": desc,
                "purdue_level": level,
                "category": cat
            })
        else:
            questions.append(item)
            
    return questions

def enrich_framework(fw):
    return fw

def enrich_question(q, fw_id):
    return q

async def main():
    run_global_cset_parser()
    print("Connecting to SurrealDB and deleting old regulations/questions...")
    try:
        # Clear out existing mock regulations and questions to prevent duplicates and clean the slate
        await repo_query_with_retry("DELETE regulation; DELETE question;")
        print("Existing database slate cleared successfully.")
    except Exception as e:
        print(f"Error clearing database: {e}")
        return

    print(f"Generating authentic CSET library (63 regulations)...")
    
    regulations_to_insert = []
    questions_to_insert = []
    
    for fw in FRAMEWORKS:
        fw_enriched = enrich_framework(fw)
        reg_id = f"regulation:{fw_enriched['id']}"
        
        # Load questions dynamically
        q_list_raw = generate_questions(fw_enriched)
        q_list = [enrich_question(q, fw_enriched["id"]) for q in q_list_raw]
        
        # Determine source file
        source_file = "cset_catalog.json" if fw_enriched["id"] in CSET_CATALOG_DATA else "generate_cset_library.py"
        
        reg_record = {
            "id": reg_id,
            "name": fw_enriched["name"],
            "fullName": fw_enriched["fullName"],
            "description": fw_enriched["description"],
            "category": fw_enriched["category"],
            "sector": fw_enriched["sector"],
            "sectors": fw_enriched["sectors"],
            "questionCount": len(q_list),
            "maturityLevels": fw_enriched["maturityLevels"],
            "_source_file": source_file
        }
        reg_record["_ingested_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        reg_record["_checksum"] = compute_checksum(reg_record)
        regulations_to_insert.append(reg_record)
        
        for q in q_list:
            q_source = q.get("_source_file")
            if not q_source:
                if fw_enriched["id"] in ("NIST_800_53", "NIST_800_82"):
                    q_source = "https://raw.githubusercontent.com/usnistgov/oscal-content/main/nist.gov/SP800-53/rev5/json/NIST_SP-800-53_rev5_catalog.json"
                else:
                    q_source = "generate_cset_library.py"
            
            q_record = dict(q)
            q_record["_source_file"] = q_source
            q_record["_ingested_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            q_record["_checksum"] = compute_checksum(q_record)
            questions_to_insert.append(q_record)
        
    print(f"Prepared {len(regulations_to_insert)} regulations and {len(questions_to_insert)} questions.")

    print("Hydrating regulation frameworks into SurrealDB...")
    success_regs = 0
    for reg in regulations_to_insert:
        try:
            # 1. Validate regulation
            validate_regulation(reg)
            
            # 2. Write to database using retry wrapper
            q = f"UPSERT {reg['id']} CONTENT $data;"
            data = {k: v for k, v in reg.items() if k != "id"}
            await repo_query_with_retry(q, {"data": data})
            success_regs += 1
        except ValueError as val_err:
            print(f"Validation error for regulation {reg.get('id', 'unknown')}: {val_err}")
            write_to_dlq(reg, "regulation", val_err)
        except Exception as e:
            print(f"Database write failed for regulation {reg.get('id', 'unknown')}: {e}")
            write_to_dlq(reg, "regulation", f"Database write failed: {e}")
            
    print(f"Successfully inserted {success_regs}/{len(regulations_to_insert)} regulations.")

    print("Hydrating compliance questions into SurrealDB...")
    success_qs = 0
    
    for q in questions_to_insert:
        try:
            # 1. Validate question
            validate_question(q)
            
            # 2. Write to database using retry wrapper
            query_str = f"UPSERT {q['id']} CONTENT $data;"
            data = {k: v for k, v in q.items() if k != "id"}
            await repo_query_with_retry(query_str, {"data": data})
            success_qs += 1
        except ValueError as val_err:
            print(f"Validation error for question {q.get('id', 'unknown')}: {val_err}")
            write_to_dlq(q, "question", val_err)
        except Exception as e:
            print(f"Database write failed for question {q.get('id', 'unknown')}: {e}")
            write_to_dlq(q, "question", f"Database write failed: {e}")
            
    print(f"Successfully inserted {success_qs}/{len(questions_to_insert)} questions.")
    
    print("\nDatabase hydration completed. Confirming active record counts:")
    try:
        reg_count = await repo_query_with_retry("SELECT count() FROM regulation GROUP ALL")
        q_count = await repo_query_with_retry("SELECT count() FROM question GROUP ALL")
        print("Active regulations count in DB:", reg_count)
        print("Active questions count in DB:", q_count)
    except Exception as e:
        print(f"Error checking record counts: {e}")

if __name__ == "__main__":
    asyncio.run(main())
