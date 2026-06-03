"""Activities API router.

CRUD and query operations for customer activity timeline events.
Follows the same patterns as api/routers/contacts.py.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from open_notebook.database.repository import (
    repo_create,
    repo_query,
)

router = APIRouter()

# ──────────────────────────────────────────────────────────────────────────────
# Valid activity types
# ──────────────────────────────────────────────────────────────────────────────

ACTIVITY_TYPES = [
    "notebook_created",
    "note_added",
    "source_added",
    "stage_changed",
    "contact_added",
    "contact_updated",
    "deal_updated",
    "assessment_started",
    "assessment_completed",
    "pipeline_moved",
    "customer_updated",
    "email_sent",
    "meeting_logged",
    "custom",
]

# ──────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────────────────────────────────────


class ActivityCreate(BaseModel):
    customer_id: str
    activity_type: str
    description: str
    metadata: dict = {}
    actor: str = "system"


class ActivityResponse(BaseModel):
    id: str
    customer_id: str
    activity_type: str
    description: str
    metadata: dict
    actor: str
    created: str
    updated: str


def _build_activity_response(rec: dict) -> ActivityResponse:
    """Build an ActivityResponse from a raw SurrealDB record dict."""
    return ActivityResponse(
        id=str(rec.get("id", "")),
        customer_id=str(rec.get("customer_id", "")),
        activity_type=str(rec.get("activity_type", "")),
        description=str(rec.get("description", "")),
        metadata=rec.get("metadata") or {},
        actor=str(rec.get("actor", "system")),
        created=str(rec.get("created", "")),
        updated=str(rec.get("updated", "")),
    )


def _clean_id(val: Optional[str]) -> Optional[str]:
    """Normalize a SurrealDB record ID to its bare suffix."""
    if not val:
        return None
    return str(val).split(":", 1)[-1]


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/activities/types")
async def get_activity_types():
    """Return the list of valid activity types."""
    return {"types": ACTIVITY_TYPES}


@router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(
    customer_id: str,
    limit: int = 50,
    offset: int = 0,
    activity_type: Optional[str] = None,
):
    """List activities for a customer, most recent first."""
    try:
        clean = _clean_id(customer_id)

        if activity_type:
            activities = await repo_query(
                "SELECT * FROM activity "
                "WHERE (customer_id = $cid OR customer_id = $clean) "
                "AND activity_type = $atype "
                "ORDER BY created DESC "
                "LIMIT $limit START $offset;",
                {
                    "cid": customer_id,
                    "clean": clean,
                    "atype": activity_type,
                    "limit": limit,
                    "offset": offset,
                },
            )
        else:
            activities = await repo_query(
                "SELECT * FROM activity "
                "WHERE customer_id = $cid OR customer_id = $clean "
                "ORDER BY created DESC "
                "LIMIT $limit START $offset;",
                {"cid": customer_id, "clean": clean, "limit": limit, "offset": offset},
            )

        return [_build_activity_response(rec) for rec in activities]
    except Exception as e:
        logger.error(f"Error fetching activities: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching activities: {e}")


@router.post("/activities", response_model=ActivityResponse)
async def create_activity(activity_data: ActivityCreate):
    """Create a new activity event."""
    try:
        data = activity_data.model_dump()

        # Validate activity_type (allow custom types but log a warning)
        if data["activity_type"] not in ACTIVITY_TYPES:
            logger.warning(
                f"Non-standard activity type: {data['activity_type']}"
            )

        result = await repo_create("activity", data)

        if isinstance(result, list):
            if not result:
                raise HTTPException(
                    status_code=500, detail="Failed to create activity"
                )
            result = result[0]

        return _build_activity_response(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating activity: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error creating activity: {e}"
        )
