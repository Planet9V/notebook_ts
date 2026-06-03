from datetime import datetime, timezone
from typing import List, Optional, Set

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    AssessmentAnswerResponse,
    AssessmentAnswerUpdate,
    AssessmentCreate,
    AssessmentReportResponse,
    AssessmentReportStats,
    AssessmentResponse,
    AssessmentSessionCreate,
    AssessmentSessionResponse,
    CategoryCoverage,
    ComplianceSnapshot,
)
from open_notebook.database.repository import (
    ensure_record_id,
    repo_create,
    repo_query,
    repo_update,
)

router = APIRouter()

def clean_id(val: str) -> str:
    if not val:
        return ""
    return str(val).split(":", 1)[-1]


CSET_COMPONENT_MAPPING = {
    "activedirectory": ["Active Directory"],
    "applicationserver": ["Application Server"],
    "audioswitch": ["Audio Switch"],
    "buildingautomationmanagementsystems": ["Building Automation Management Systems"],
    "dcs": ["DCS"],
    "dnsserver": ["DNS Server"],
    "databaseserver": ["Database Server"],
    "dispatchconsole": ["Dispatch Console"],
    "electronicsecuritysystem": ["Electronic Security System"],
    "emergencymedicalservicecommunicationshardware": ["Emergency Medical Service Communications Hardware"],
    "ethernetbackhaul": ["Ethernet Backhaul"],
    "firewall": ["Firewall", "VPN", "Unidirectional Device", "Link Encryption", "IDS", "IPS"],
    "handheldwirelessdevice": ["Handheld Wireless Device"],
    "historian": ["Historian", "Database Server", "Application Server", "Imaging Server"],
    "ids": ["IDS", "Firewall"],
    "ipcamera": ["IP Camera"],
    "ipphone": ["IP Phone"],
    "ips": ["IPS", "Firewall"],
    "imagingmodalitiesandequipment": ["Imaging Modalities and Equipment"],
    "imagingserver": ["Imaging Server"],
    "linkencryption": ["Link Encryption"],
    "mailserver": ["Mail Server"],
    "modem": ["Modem"],
    "multiprotocollabelswitching": ["Multi Protocol Label Switching"],
    "networkprinter": ["Network Printer"],
    "networkscannerandcopier": ["Network Scanner And Copier"],
    "opticalringsystem": ["Optical Ring System"],
    "partner": ["Partner"],
    "physiologicalmonitoringsystem": ["Physiological Monitoring System"],
    "poweroverethernet": ["Power Over Ethernet"],
    "publickiosk": ["Public Kiosk"],
    "rfidtransmitter": ["RFID Transmitter"],
    "radiosite": ["Radio Site"],
    "realtimelocationsystem": ["Real Time Location System"],
    "relaypanel": ["Relay Panel"],
    "router": ["Router"],
    "safetyinstrumentedsystem": ["Safety Instrumented System"],
    "securityinformationandeventmanagementsystem": ["Security Information And Event Management System"],
    "subscriberradio": ["Subscriber Radio"],
    "switch": ["Switch", "VLAN Switch", "VLAN Router", "Router", "Ethernet Backhaul", "Optical Ring System", "Multi Protocol Label Switching"],
    "terminalserver": ["Terminal Server"],
    "unidirectionaldevice": ["Unidirectional Device"],
    "vlanrouter": ["VLAN Router"],
    "vlanswitch": ["VLAN Switch"],
    "vpn": ["VPN", "Firewall"],
    "webserver": ["Web Server"],
    "windowsupdateserver": ["Windows Update Server"],
    "wirelessmodem": ["Wireless Modem"],
    "wirelessnetwork": ["Wireless Network"],
    "rtu": ["RTU", "Relay Panel"],
    "plc": ["DCS"],
}


async def get_active_cset_prefixes_for_session(sess_id: str, fw_id: str) -> Optional[set]:
    """Resolves active CSET component prefixes for the Components framework session."""
    if str(fw_id) != "regulation:Components":
        return None

    active_prefixes = {"Comp"}  # general component questions are always active

    try:
        sess_rec = ensure_record_id(sess_id)
        sess_res = await repo_query("SELECT assessment_id FROM $id", {"id": sess_rec})
        if not sess_res:
            return active_prefixes

        assessment_id = sess_res[0].get("assessment_id")
        if not assessment_id:
            return active_prefixes

        assess_res = await repo_query("SELECT customer_id FROM $id", {"id": ensure_record_id(assessment_id)})
        if not assess_res:
            return active_prefixes

        customer_id = assess_res[0].get("customer_id")
        if not customer_id:
            return active_prefixes

        notebooks = await repo_query(
            "SELECT id FROM notebook WHERE customer_id != NONE AND type::string(customer_id) = type::string($cust_id) AND (archived = false OR archived = None)",
            {"cust_id": customer_id}
        )
        if not notebooks:
            return active_prefixes

        notebook_id = notebooks[0]["id"]

        assets = await repo_query(
            "SELECT type FROM asset WHERE notebook_id = $nb_id",
            {"nb_id": notebook_id}
        )

        for asset in assets:
            asset_type = asset.get("type", "")
            if not asset_type:
                continue
            normalized_type = asset_type.lower().replace("_", "").replace(" ", "")
            mapped_prefixes = CSET_COMPONENT_MAPPING.get(normalized_type, [])
            for p in mapped_prefixes:
                active_prefixes.add(p)
            # Add basic capitalized/upper forms as fallback
            active_prefixes.add(asset_type.upper())
            active_prefixes.add(asset_type.capitalize())
            active_prefixes.add(asset_type)
            
    except Exception as e:
        logger.error(f"Error resolving active CSET prefixes: {e}")

    return active_prefixes



@router.post("/assessments", response_model=AssessmentResponse)
async def create_assessment(data: AssessmentCreate):
    """Link a customer profile to a compliance framework assessment."""
    try:
        cust_id = data.customer_id
        if ":" not in cust_id:
            cust_id = f"customer:{cust_id}"
            
        fw_id = data.framework_id
        if ":" not in fw_id:
            fw_id = f"regulation:{fw_id}"
            
        # Check if customer exists
        cust_check = await repo_query("SELECT id FROM $id", {"id": ensure_record_id(cust_id)})
        if not cust_check:
            raise HTTPException(status_code=404, detail="Customer profile not found")
            
        # Check if regulation exists
        reg_check = await repo_query("SELECT id FROM $id", {"id": ensure_record_id(fw_id)})
        if not reg_check:
            raise HTTPException(status_code=404, detail="Compliance framework not found")
            
        # Check for existing link
        existing = await repo_query(
            "SELECT * FROM assessment WHERE type::string(customer_id) = type::string($cust_id) AND type::string(framework_id) = type::string($fw_id)",
            {"cust_id": cust_id, "fw_id": fw_id}
        )
        
        if existing:
            rec = existing[0]
        else:
            rec = await repo_create("assessment", {
                "customer_id": cust_id,
                "framework_id": fw_id,
                "created_at": datetime.now(timezone.utc).isoformat() + "Z"
            })
            if isinstance(rec, list):
                rec = rec[0]
                
        # Emit activity for new assessments
        if not existing:
            from api.routers.activity_emitter import emit_activity
            fw_name = str(reg_check[0].get("name", fw_id)) if reg_check else fw_id
            await emit_activity(
                customer_id=cust_id,
                activity_type="assessment_started",
                description=f"Compliance assessment started: {fw_name}",
                metadata={"assessment_id": str(rec["id"]), "framework_id": str(fw_id)},
            )

        return AssessmentResponse(
            id=str(rec["id"]),
            customer_id=str(rec["customer_id"]),
            framework_id=str(rec["framework_id"]),
            created_at=str(rec.get("created_at") or "")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating compliance assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments", response_model=List[AssessmentResponse])
async def get_assessments(customer_id: str):
    """Retrieve all compliance framework assessments active for a customer."""
    try:
        cust_id = customer_id
        if ":" not in cust_id:
            cust_id = f"customer:{cust_id}"
            
        results = await repo_query(
            "SELECT * FROM assessment WHERE type::string(customer_id) = type::string($cust_id) ORDER BY created_at DESC",
            {"cust_id": cust_id}
        )
        
        return [
            AssessmentResponse(
                id=str(row["id"]),
                customer_id=str(row["customer_id"]),
                framework_id=str(row["framework_id"]),
                created_at=str(row.get("created_at") or "")
            )
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching assessments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assessments/{assessment_id}/sessions", response_model=AssessmentSessionResponse)
async def create_session(assessment_id: str, data: AssessmentSessionCreate):
    """Start a new CSET audit session milestone, optionally copying from the last completed session."""
    try:
        assess_id = assessment_id
        if ":" not in assess_id:
            assess_id = f"assessment:{assessment_id}"
            
        # Check if assessment link exists
        assess = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(assess_id)})
        if not assess:
            raise HTTPException(status_code=404, detail="Assessment link not found")
            
        assessment_record = assess[0]
        fw_id = assessment_record.get("framework_id")
        
        # Create the new session
        session_data = {
            "assessment_id": assess_id,
            "session_name": data.session_name,
            "status": "IN_PROGRESS",
            "version_lock": fw_id,
            "created_at": datetime.now(timezone.utc).isoformat() + "Z",
            "completed_at": None
        }
        
        new_sess = await repo_create("assessment_session", session_data)
        if isinstance(new_sess, list):
            new_sess = new_sess[0]
            
        new_sess_id = str(new_sess["id"])
        
        # Perform carry-forward if requested and a prior session exists
        if data.carry_forward_prior:
            prior = await repo_query(
                "SELECT id, created_at FROM assessment_session WHERE type::string(assessment_id) = type::string($assess_id) ORDER BY created_at DESC LIMIT 2",
                {"assess_id": assess_id}
            )
            # Since LIMIT 2 returns the newly created one as index 0, check if a prior index 1 exists
            if len(prior) > 1:
                prior_sess_id = str(prior[1]["id"])
                logger.info(f"Carrying forward baseline answers from prior session {prior_sess_id} to new session {new_sess_id}")
                
                # Retrieve all answers from prior session
                prior_answers = await repo_query(
                    "SELECT * FROM assessment_answer WHERE type::string(session_id) = type::string($prior_sess_id)",
                    {"prior_sess_id": prior_sess_id}
                )
                
                for ans in prior_answers:
                    await repo_create("assessment_answer", {
                        "session_id": new_sess_id,
                        "question_id": ans["question_id"],
                        "answer": ans["answer"],
                        "comments": ans.get("comments") or "",
                        "evidence_url": ans.get("evidence_url") or "",
                        "updated_at": datetime.now(timezone.utc).isoformat() + "Z"
                    })
                    
        # Emit activity for new session
        assess_record = assess[0]
        cust_id = assess_record.get("customer_id")
        if cust_id:
            from api.routers.activity_emitter import emit_activity
            await emit_activity(
                customer_id=str(cust_id),
                activity_type="assessment_started",
                description=f"Audit session \"{data.session_name}\" started",
                metadata={"session_id": new_sess_id, "assessment_id": assess_id},
            )

        return AssessmentSessionResponse(
            id=new_sess_id,
            assessment_id=str(new_sess["assessment_id"]),
            session_name=str(new_sess["session_name"]),
            created_at=str(new_sess["created_at"]),
            completed_at=new_sess.get("completed_at"),
            status=str(new_sess["status"]),
            version_lock=new_sess.get("version_lock")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating audit session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments/{assessment_id}/sessions", response_model=List[AssessmentSessionResponse])
async def get_sessions(assessment_id: str):
    """List all audit sessions under a specific assessment."""
    try:
        assess_id = assessment_id
        if ":" not in assess_id:
            assess_id = f"assessment:{assessment_id}"
            
        results = await repo_query(
            "SELECT * FROM assessment_session WHERE type::string(assessment_id) = type::string($assess_id) ORDER BY created_at DESC",
            {"assess_id": assess_id}
        )
        
        return [
            AssessmentSessionResponse(
                id=str(row["id"]),
                assessment_id=str(row["assessment_id"]),
                session_name=str(row["session_name"]),
                created_at=str(row["created_at"]),
                completed_at=row.get("completed_at"),
                status=str(row["status"]),
                version_lock=row.get("version_lock")
            )
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/questions")
async def get_session_questions(session_id: str):
    """Retrieve all framework questions hydrated with existing session answers in a single joined payload."""
    try:
        sess_id = session_id
        if ":" not in sess_id:
            sess_id = f"assessment_session:{session_id}"
            
        sess_check = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(sess_id)})
        if not sess_check:
            raise HTTPException(status_code=404, detail="Audit session not found")
            
        session = sess_check[0]
        fw_id = session.get("version_lock")
        
        # Resolve active prefixes for Components framework linkage
        active_prefixes = await get_active_cset_prefixes_for_session(sess_id, fw_id)

        # Load all standard questions
        questions = await repo_query(
            "SELECT * FROM question WHERE regulation_id = $fw_id ORDER BY standard_code ASC",
            {"fw_id": fw_id}
        )
        
        # Load all answered responses in this session
        answers = await repo_query(
            "SELECT * FROM assessment_answer WHERE type::string(session_id) = type::string($session_id)",
            {"session_id": sess_id}
        )
        
        # Create quick lookup map for answered questions
        answer_map = {ans["question_id"]: ans for ans in answers}
        
        results = []
        for q in questions:
            q_id = str(q["id"])
            existing_ans = answer_map.get(q_id)
            
            ans_val = "U"
            if existing_ans:
                ans_val = existing_ans["answer"]
                
            # Under "no exclusion" policy, mark questions as NA if their component type is not present on canvas
            if active_prefixes is not None:
                std_code = q.get("standard_code") or ""
                is_active = False
                for prefix in active_prefixes:
                    if std_code.strip().startswith(prefix):
                        is_active = True
                        break
                if not is_active:
                    ans_val = "NA"
            
            results.append({
                "question_id": q_id,
                "standard_code": q.get("standard_code") or "",
                "question_text": q.get("question_text") or "",
                "description": q.get("description") or "",
                "purdue_level": int(q.get("purdue_level") or 0),
                "category": q.get("category") or "Control",
                "answer": ans_val,
                "comments": existing_ans["comments"] if existing_ans else "",
                "evidence_url": existing_ans["evidence_url"] if existing_ans else "",
                "updated_at": existing_ans["updated_at"] if existing_ans else ""
            })
            
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/sessions/{session_id}/answers/{question_id}", response_model=AssessmentAnswerResponse)
async def update_answer(session_id: str, question_id: str, data: AssessmentAnswerUpdate):
    """Autosave or update an individual compliance answer inside an audit session."""
    try:
        sess_id = session_id
        if ":" not in sess_id:
            sess_id = f"assessment_session:{session_id}"
            
        q_id = question_id
        if ":" not in q_id:
            q_id = f"question:{question_id}"
            
        # Verify session exists and is active
        sess_check = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(sess_id)})
        if not sess_check:
            raise HTTPException(status_code=404, detail="Audit session not found")
            
        if sess_check[0].get("status") == "COMPLETED":
            raise HTTPException(status_code=400, detail="Cannot edit answers inside a completed audit session")
            
        # Check if answer record already exists
        existing = await repo_query(
            "SELECT id FROM assessment_answer WHERE type::string(session_id) = type::string($session_id) AND type::string(question_id) = type::string($question_id)",
            {"session_id": sess_id, "question_id": q_id}
        )
        
        now_str = datetime.now(timezone.utc).isoformat() + "Z"
        
        if existing:
            ans_record_id = str(existing[0]["id"])
            result = await repo_update("assessment_answer", ans_record_id, {
                "answer": data.answer,
                "comments": data.comments or "",
                "evidence_url": data.evidence_url or "",
                "updated_at": now_str
            })
        else:
            result = await repo_create("assessment_answer", {
                "session_id": sess_id,
                "question_id": q_id,
                "answer": data.answer,
                "comments": data.comments or "",
                "evidence_url": data.evidence_url or "",
                "updated_at": now_str
            })
            
        if isinstance(result, list):
            result = result[0]
            
        return AssessmentAnswerResponse(
            id=str(result["id"]),
            session_id=str(result["session_id"]),
            question_id=str(result["question_id"]),
            answer=str(result["answer"]),
            comments=str(result.get("comments") or ""),
            evidence_url=str(result.get("evidence_url") or ""),
            updated_at=str(result["updated_at"])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving wizard answer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/complete", response_model=AssessmentSessionResponse)
async def complete_session(session_id: str):
    """Finalize and lock an active audit session milestone and store a static compliance snapshot."""
    try:
        sess_id = session_id
        if ":" not in sess_id:
            sess_id = f"assessment_session:{session_id}"
            
        sess_check = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(sess_id)})
        if not sess_check:
            raise HTTPException(status_code=404, detail="Audit session not found")
            
        session_record = sess_check[0]
        fw_id = session_record.get("version_lock")

        # Load standard questions & custom fields
        questions = await repo_query(
            "SELECT * FROM question WHERE regulation_id = $fw_id",
            {"fw_id": fw_id}
        )
        
        # Load answers
        answers = await repo_query(
            "SELECT * FROM assessment_answer WHERE type::string(session_id) = type::string($session_id)",
            {"session_id": sess_id}
        )
        
        answer_map = {ans["question_id"]: ans for ans in answers}
        
        # Resolve active prefixes for Components framework linkage
        active_prefixes = await get_active_cset_prefixes_for_session(sess_id, fw_id)
        
        total_questions = len(questions)
        
        yes_count = 0
        no_count = 0
        na_count = 0
        alt_count = 0
        answered_count = 0
        
        # Calculate statistics
        for q in questions:
            q_id = str(q["id"])
            ans = answer_map.get(q_id)
            
            ans_val = "U"
            if ans:
                ans_val = ans["answer"]
                
            # Enforce "no exclusion" asset register linkage
            is_active = True
            if active_prefixes is not None:
                std_code = q.get("standard_code") or ""
                is_active = False
                for prefix in active_prefixes:
                    if std_code.strip().startswith(prefix):
                        is_active = True
                        break
                if not is_active:
                    ans_val = "NA"
            
            if ans_val == "Y":
                yes_count += 1
            elif ans_val == "N":
                no_count += 1
            elif ans_val == "NA":
                na_count += 1
            elif ans_val == "ALT":
                alt_count += 1
            elif ans_val == "U":
                no_count += 1  # Unanswered defaults to NO
                
            if is_active and ans and ans["answer"] != "U":
                answered_count += 1
        
        denominator = total_questions - na_count
        compliance_score = ((yes_count + alt_count) / denominator) * 100 if denominator > 0 else 0.0
        
        # Category coverage analysis
        category_map = {}
        for q in questions:
            cat = q.get("category") or "Control"
            if cat not in category_map:
                category_map[cat] = {"total": 0, "answered": 0, "yes_count": 0}
            
            q_id = str(q["id"])
            ans = answer_map.get(q_id)
            
            ans_val = "U"
            if ans:
                ans_val = ans["answer"]
                
            is_active = True
            if active_prefixes is not None:
                std_code = q.get("standard_code") or ""
                is_active = False
                for prefix in active_prefixes:
                    if std_code.strip().startswith(prefix):
                        is_active = True
                        break
                if not is_active:
                    ans_val = "NA"
            
            if ans_val != "NA":
                category_map[cat]["total"] += 1
                if ans and ans["answer"] != "U":
                    category_map[cat]["answered"] += 1
                if ans_val in ["Y", "ALT"]:
                    category_map[cat]["yes_count"] += 1
                    
        category_coverage = []
        for cat, metrics in category_map.items():
            tot = metrics["total"]
            yes = metrics["yes_count"]
            score = (yes / tot) * 100 if tot > 0 else 0.0
            category_coverage.append({
                "category": cat,
                "total": tot,
                "answered": metrics["answered"],
                "yes_count": yes,
                "score": score
            })

        compliance_snapshot = {
            "compliance_score": compliance_score,
            "total_questions": total_questions,
            "answered_count": answered_count,
            "yes_count": yes_count,
            "no_count": no_count,
            "na_count": na_count,
            "alt_count": alt_count,
            "category_coverage": category_coverage
        }

        result = await repo_update("assessment_session", sess_id, {
            "status": "COMPLETED",
            "completed_at": datetime.now(timezone.utc).isoformat() + "Z",
            "compliance_snapshot": compliance_snapshot
        })
        
        if isinstance(result, list):
            result = result[0]
            
        return AssessmentSessionResponse(
            id=str(result["id"]),
            assessment_id=str(result["assessment_id"]),
            session_name=str(result["session_name"]),
            created_at=str(result["created_at"]),
            completed_at=result.get("completed_at"),
            status=str(result["status"]),
            version_lock=result.get("version_lock"),
            compliance_snapshot=result.get("compliance_snapshot")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error locking session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/report", response_model=AssessmentReportResponse)
async def get_session_report(session_id: str):
    """Generate CSET-style auditing report: scoring indices, category coverages, and prioritizations."""
    try:
        sess_id = session_id
        if ":" not in sess_id:
            sess_id = f"assessment_session:{session_id}"
            
        sess_check = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(sess_id)})
        if not sess_check:
            raise HTTPException(status_code=404, detail="Audit session not found")
            
        session = sess_check[0]
        fw_id = session.get("version_lock")
        
        # Load standard questions & custom fields
        questions = await repo_query(
            "SELECT * FROM question WHERE regulation_id = $fw_id",
            {"fw_id": fw_id}
        )
        
        # Load answers
        answers = await repo_query(
            "SELECT * FROM assessment_answer WHERE type::string(session_id) = type::string($session_id)",
            {"session_id": sess_id}
        )
        
        answer_map = {ans["question_id"]: ans for ans in answers}
        
        # Resolve active prefixes for Components framework linkage
        active_prefixes = await get_active_cset_prefixes_for_session(sess_id, fw_id)
        
        total_questions = len(questions)
        
        yes_count = 0
        no_count = 0
        na_count = 0
        alt_count = 0
        answered_count = 0
        
        # Calculate statistics
        for q in questions:
            q_id = str(q["id"])
            ans = answer_map.get(q_id)
            
            ans_val = "U"
            if ans:
                ans_val = ans["answer"]
                
            # Enforce "no exclusion" asset register linkage
            is_active = True
            if active_prefixes is not None:
                std_code = q.get("standard_code") or ""
                is_active = False
                for prefix in active_prefixes:
                    if std_code.strip().startswith(prefix):
                        is_active = True
                        break
                if not is_active:
                    ans_val = "NA"
            
            if ans_val == "Y":
                yes_count += 1
            elif ans_val == "N":
                no_count += 1
            elif ans_val == "NA":
                na_count += 1
            elif ans_val == "ALT":
                alt_count += 1
            elif ans_val == "U":
                no_count += 1  # Unanswered defaults to NO
                
            if is_active and ans and ans["answer"] != "U":
                answered_count += 1
        
        completion_percentage = (answered_count / total_questions) * 100 if total_questions > 0 else 0.0
        
        # Compliance score: YES + ALT compared against all non-N/A questions
        denominator = total_questions - na_count
        compliance_score = ((yes_count + alt_count) / denominator) * 100 if denominator > 0 else 0.0
        
        # Category coverage analysis
        category_map = {}
        for q in questions:
            cat = q.get("category") or "Control"
            if cat not in category_map:
                category_map[cat] = {"total": 0, "answered": 0, "yes_count": 0}
            
            q_id = str(q["id"])
            ans = answer_map.get(q_id)
            
            ans_val = "U"
            if ans:
                ans_val = ans["answer"]
                
            is_active = True
            if active_prefixes is not None:
                std_code = q.get("standard_code") or ""
                is_active = False
                for prefix in active_prefixes:
                    if std_code.strip().startswith(prefix):
                        is_active = True
                        break
                if not is_active:
                    ans_val = "NA"
            
            if ans_val != "NA":
                category_map[cat]["total"] += 1
                if ans and ans["answer"] != "U":
                    category_map[cat]["answered"] += 1
                if ans_val in ["Y", "ALT"]:
                    category_map[cat]["yes_count"] += 1
                    
        category_coverage = []
        for cat, metrics in category_map.items():
            tot = metrics["total"]
            yes = metrics["yes_count"]
            score = (yes / tot) * 100 if tot > 0 else 0.0
            category_coverage.append(
                CategoryCoverage(
                    category=cat,
                    total=tot,
                    answered=metrics["answered"],
                    yes_count=yes,
                    score=score
                )
            )
            
        # Prioritized recommendations
        prioritized_recommendations = []
        for q in questions:
            q_id = str(q["id"])
            ans = answer_map.get(q_id)
            
            ans_val = "U"
            if ans:
                ans_val = ans["answer"]
                
            is_active = True
            if active_prefixes is not None:
                std_code = q.get("standard_code") or ""
                is_active = False
                for prefix in active_prefixes:
                    if std_code.strip().startswith(prefix):
                        is_active = True
                        break
                if not is_active:
                    ans_val = "NA"
            
            # Recommend fixing if active and (unanswered or explicitly answered 'NO')
            if is_active and (ans_val == "U" or ans_val == "N"):
                p_level = int(q.get("purdue_level") or 0)
                
                # Priority mapping: Purdue Level 1 & 2 is Critical (kinetic boundary)
                if p_level in [1, 2]:
                    priority = "Critical"
                    order = 1
                elif p_level == 3:
                    priority = "High"
                    order = 2
                else:
                    priority = "Medium"
                    order = 3
                    
                prioritized_recommendations.append({
                    "question_id": q_id,
                    "standard_code": q.get("standard_code") or "",
                    "question_text": q.get("question_text") or "",
                    "category": q.get("category") or "Control",
                    "purdue_level": p_level,
                    "description": q.get("description") or "",
                    "priority": priority,
                    "order": order
                })
                
        # Sort recommendations by order first, then standard code
        prioritized_recommendations.sort(key=lambda x: (x["order"], x["standard_code"]))
        
        stats = AssessmentReportStats(
            total_questions=total_questions,
            answered_count=answered_count,
            yes_count=yes_count,
            no_count=no_count,
            na_count=na_count,
            alt_count=alt_count,
            completion_percentage=completion_percentage,
            compliance_score=compliance_score
        )
        
        return AssessmentReportResponse(
            session_id=sess_id,
            session_name=str(session["session_name"]),
            framework_id=str(fw_id),
            stats=stats,
            category_coverage=category_coverage,
            prioritized_recommendations=prioritized_recommendations
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error compiling session report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments/{assessment_id}/trends")
async def get_assessment_trends(assessment_id: str):
    """Retrieve chronological trends and deltas across all completed sessions in an assessment."""
    try:
        assess_id = assessment_id
        if ":" not in assess_id:
            assess_id = f"assessment:{assessment_id}"
            
        sessions = await repo_query(
            "SELECT * FROM assessment_session WHERE type::string(assessment_id) = type::string($assess_id) ORDER BY created_at ASC",
            {"assess_id": assess_id}
        )
        
        trends = []
        previous_score = None
        
        for sess in sessions:
            sess_id = str(sess["id"])
            fw_id = sess.get("version_lock")
            
            # Load answers & questions for scoring
            q_count_res = await repo_query(
                "SELECT count() FROM question WHERE regulation_id = $fw_id GROUP ALL",
                {"fw_id": fw_id}
            )
            total_questions = q_count_res[0]["count"] if q_count_res else 0
            
            ans_res = await repo_query(
                "SELECT answer FROM assessment_answer WHERE type::string(session_id) = type::string($session_id)",
                {"session_id": sess_id}
            )
            
            yes_count = sum(1 for a in ans_res if a["answer"] == "Y")
            alt_count = sum(1 for a in ans_res if a["answer"] == "ALT")
            na_count = sum(1 for a in ans_res if a["answer"] == "NA")
            
            denominator = total_questions - na_count
            compliance_score = ((yes_count + alt_count) / denominator) * 100 if denominator > 0 else 0.0
            
            delta = 0.0
            if previous_score is not None:
                delta = compliance_score - previous_score
                
            trends.append({
                "session_id": sess_id,
                "session_name": str(sess["session_name"]),
                "created_at": str(sess["created_at"]),
                "completed_at": sess.get("completed_at"),
                "status": str(sess["status"]),
                "compliance_score": compliance_score,
                "delta": delta
            })
            
            if sess["status"] == "COMPLETED":
                previous_score = compliance_score
                
        return trends
    except Exception as e:
        logger.error(f"Error computing auditing trends: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
