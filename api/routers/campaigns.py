"""
Campaigns API router.

CRUD operations for Campaign entities.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from api.auth import require_role
from api.models import CampaignCreate, CampaignResponse, CampaignUpdate
from open_notebook.domain.campaign import Campaign
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError, NotFoundError

router = APIRouter()


def _build_campaign_response(campaign: Campaign) -> CampaignResponse:
    """Build a CampaignResponse from a Campaign domain model."""
    return CampaignResponse(
        id=str(campaign.id),
        name=campaign.name,
        description=campaign.description,
        theme=campaign.theme,
        status=campaign.status,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        target_audience=campaign.target_audience,
        channels=campaign.channels or [],
        customer_id=str(campaign.customer_id) if campaign.customer_id else None,
        notebook_id=str(campaign.notebook_id) if campaign.notebook_id else None,
        created=str(campaign.created) if campaign.created else "",
        updated=str(campaign.updated) if campaign.updated else "",
    )


@router.get("/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    notebook_id: Optional[str] = Query(None, description="Filter by notebook ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all campaigns with optional filtering."""
    try:
        campaigns = await Campaign.get_all(order_by="updated desc")

        if customer_id:
            campaigns = [c for c in campaigns if c.customer_id == customer_id or str(c.customer_id) == customer_id]
        if notebook_id:
            campaigns = [c for c in campaigns if c.notebook_id == notebook_id or str(c.notebook_id) == notebook_id]
        if status:
            campaigns = [c for c in campaigns if c.status == status]

        return [_build_campaign_response(c) for c in campaigns]
    except Exception as e:
        logger.error(f"Error listing campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns", response_model=CampaignResponse, status_code=201)
async def create_campaign(data: CampaignCreate, _ = Depends(require_role("editor"))):
    """Create a new campaign."""
    try:
        campaign = Campaign(
            name=data.name,
            description=data.description,
            theme=data.theme,
            status=data.status or "draft",
            start_date=data.start_date,
            end_date=data.end_date,
            target_audience=data.target_audience,
            channels=data.channels or [],
            customer_id=data.customer_id,
            notebook_id=data.notebook_id,
        )
        await campaign.save()
        return _build_campaign_response(campaign)
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str):
    """Get a single campaign by ID."""
    try:
        campaign = await Campaign.get(campaign_id)
        return _build_campaign_response(campaign)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Campaign not found")
    except Exception as e:
        logger.error(f"Error getting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(campaign_id: str, data: CampaignUpdate, _ = Depends(require_role("editor"))):
    """Update a campaign."""
    try:
        campaign = await Campaign.get(campaign_id)
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if hasattr(campaign, key):
                setattr(campaign, key, value)

        await campaign.save()
        return _build_campaign_response(campaign)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Campaign not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, _ = Depends(require_role("editor"))):
    """Delete a campaign."""
    try:
        from open_notebook.database.repository import repo_delete
        await repo_delete(campaign_id)
        return {"message": "Campaign deleted", "id": campaign_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Campaign not found")
    except Exception as e:
        logger.error(f"Error deleting campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))
