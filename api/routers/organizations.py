import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import OrganizationCreate, OrganizationResponse
from open_notebook.database.repository import repo_query, repo_upsert

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])


@router.post("", response_model=OrganizationResponse)
async def create_organization(payload: OrganizationCreate):
    """Create a new organization."""
    try:
        # Check if organization with the same name already exists
        existing = await repo_query(
            "SELECT * FROM organization WHERE name = $name;",
            {"name": payload.name}
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Organization with name '{payload.name}' already exists"
            )

        org_id = f"organization:{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        record = {
            "name": payload.name,
            "type": payload.type,
            "status": payload.status,
            "created": now,
            "updated": now,
        }
        res = await repo_upsert("organization", org_id, record)
        if not res:
            raise HTTPException(
                status_code=500,
                detail="Failed to create organization in database"
            )
        
        org = res[0]
        return OrganizationResponse(
            id=org["id"],
            name=org["name"],
            type=org["type"],
            status=org["status"],
            created=str(org.get("created", "")),
            updated=str(org.get("updated", ""))
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating organization: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating organization: {str(e)}"
        )


@router.get("", response_model=List[OrganizationResponse])
async def list_organizations():
    """List all organizations."""
    try:
        orgs = await repo_query("SELECT * FROM organization ORDER BY name;")
        return [
            OrganizationResponse(
                id=org["id"],
                name=org["name"],
                type=org["type"],
                status=org["status"],
                created=str(org.get("created", "")),
                updated=str(org.get("updated", ""))
            )
            for org in orgs
        ]
    except Exception as e:
        logger.error(f"Error listing organizations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing organizations: {str(e)}"
        )
