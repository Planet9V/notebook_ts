from typing import List

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import QuestionResponse, RegulationResponse
from open_notebook.database.repository import ensure_record_id, repo_query

router = APIRouter()

@router.get("/regulations", response_model=List[RegulationResponse])
async def get_regulations():
    """Retrieve all CSET regulatory frameworks and standards."""
    logger.info("Fetching CSET regulations from SurrealDB")
    try:
        results = await repo_query("SELECT * FROM regulation ORDER BY name ASC")
        regulations = []
        for row in results:
            regulations.append(
                RegulationResponse(
                    id=row["id"],
                    name=row["name"],
                    fullName=row.get("fullName") or row.get("full_name") or row["name"],
                    description=row.get("description") or "",
                    category=row.get("category") or "General IT/OT",
                    sector=row.get("sector") or "Cross-Sector",
                    sectors=row.get("sectors") or [row.get("sector") or "Cross-Sector"],
                    questionCount=int(row.get("questionCount") or row.get("question_count") or 0),
                    maturityLevels=row.get("maturityLevels") or row.get("maturity_levels") or ["Standard"]
                )
            )
        return regulations
    except Exception as e:
        logger.error(f"Error fetching regulations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/regulations/{regulation_id}/questions", response_model=List[QuestionResponse])
async def get_regulation_questions(regulation_id: str):
    """Retrieve all questions / requirements belonging to a specific CSET framework."""
    # Ensure correct record ID format (e.g. regulation:IEC_62443_3_3)
    full_id = f"regulation:{regulation_id}" if ":" not in regulation_id else regulation_id
    target_id = ensure_record_id(full_id)
    logger.info(f"Fetching questions for regulation: {target_id}")
    
    try:
        # Check if regulation exists
        reg_check = await repo_query("SELECT id FROM regulation WHERE id = $id", {"id": target_id})
        if not reg_check:
            raise HTTPException(status_code=404, detail="Regulation not found")
            
        results = await repo_query(
            "SELECT * FROM question WHERE type::string(regulation_id) = type::string($regulation_id) ORDER BY standard_code ASC",
            {"regulation_id": regulation_id}
        )
        
        questions = []
        for row in results:
            questions.append(
                QuestionResponse(
                    id=row["id"],
                    regulation_id=row["regulation_id"],
                    standard_code=row.get("standard_code") or "",
                    question_text=row.get("question_text") or "",
                    description=row.get("description") or "",
                    purdue_level=int(row.get("purdue_level") or 0),
                    category=row.get("category") or "Control"
                )
            )
        return questions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching questions for regulation {target_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
