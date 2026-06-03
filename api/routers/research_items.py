"""Research Items API router.

CRUD operations for ResearchItem entities with search execution and cross-linking.
Supports the Research Intelligence Kanban workflow.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import (
    LinkRequest,
    ResearchItemCreate,
    ResearchItemResponse,
    ResearchItemUpdate,
)
from open_notebook.domain.research_item import ResearchItem
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError, NotFoundError

router = APIRouter()


def _build_ri_response(ri: ResearchItem) -> ResearchItemResponse:
    """Build a ResearchItemResponse from a ResearchItem domain model."""
    # Build engines list: prefer explicit engines[], fall back to single engine
    engines_list = ri.engines if ri.engines else ([ri.engine] if ri.engine else ["perplexity"])
    return ResearchItemResponse(
        id=str(ri.id),
        name=ri.name,
        query=ri.query,
        description=ri.description or "",
        customer_id=ri.customer_id,
        project_id=ri.project_id,
        notebook_id=ri.notebook_id,
        transformation_id=ri.transformation_id,
        stage=ri.stage or "queued",
        status=ri.status or "active",
        engine=ri.engine or "perplexity",
        engines=engines_list,
        formatting_instructions=ri.formatting_instructions or "",
        model_id=ri.model_id,
        interval=ri.interval,
        is_recurring=ri.is_recurring or False,
        last_run=str(ri.last_run) if ri.last_run else None,
        next_run=str(ri.next_run) if ri.next_run else None,
        run_count=ri.run_count or 0,
        last_error=ri.last_error,
        results_summary=ri.results_summary or "",
        save_as_source=ri.save_as_source if ri.save_as_source is not None else True,
        tags=ri.tags or [],
        created=str(ri.created) if ri.created else "",
        updated=str(ri.updated) if ri.updated else "",
    )


@router.get("/research-items", response_model=List[ResearchItemResponse])
async def list_research_items(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all research items with optional filtering."""
    try:
        if customer_id:
            items = await ResearchItem.get_by_customer(customer_id)
        elif project_id:
            items = await ResearchItem.get_by_project(project_id)
        elif stage:
            items = await ResearchItem.get_by_stage(stage)
        else:
            items = await ResearchItem.get_all(order_by="updated desc")

        if status:
            items = [i for i in items if i.status == status]

        return [_build_ri_response(i) for i in items]
    except Exception as e:
        logger.error(f"Error listing research items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items", response_model=ResearchItemResponse, status_code=201)
async def create_research_item(data: ResearchItemCreate):
    """Create a new research item."""
    try:
        ri = ResearchItem(
            name=data.name,
            query=data.query,
            description=data.description or "",
            customer_id=data.customer_id,
            project_id=data.project_id,
            notebook_id=data.notebook_id,
            transformation_id=data.transformation_id,
            stage=data.stage or "queued",
            engine=data.engine or "perplexity",
            engines=data.engines or [],
            formatting_instructions=data.formatting_instructions or "",
            model_id=data.model_id,
            interval=data.interval,
            is_recurring=data.is_recurring or False,
            save_as_source=data.save_as_source if data.save_as_source is not None else True,
            tags=data.tags or [],
        )

        # Sync engine from engines[] if provided
        if ri.engines and not data.engine:
            ri.engine = ri.engines[0]

        # If recurring, compute next_run
        if ri.is_recurring and ri.interval:
            ri.next_run = ri.compute_next_run()

        await ri.save()

        # Auto-link to customer if specified
        if data.customer_id:
            try:
                await ri.link_customer(data.customer_id)
            except Exception as link_err:
                logger.warning(f"Could not auto-link research to customer: {link_err}")

        # Auto-link to project if specified
        if data.project_id:
            try:
                await ri.link_project(data.project_id)
            except Exception as link_err:
                logger.warning(f"Could not auto-link research to project: {link_err}")

        return _build_ri_response(ri)
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research-items/{item_id}", response_model=ResearchItemResponse)
async def get_research_item(item_id: str):
    """Get a single research item by ID."""
    try:
        ri = await ResearchItem.get(item_id)
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error getting research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/research-items/{item_id}", response_model=ResearchItemResponse)
async def update_research_item(item_id: str, data: ResearchItemUpdate):
    """Update a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if hasattr(ri, key):
                setattr(ri, key, value)

        # Recompute next_run if scheduling changed
        if ri.is_recurring and ri.interval:
            ri.next_run = ri.compute_next_run()

        await ri.save()
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/research-items/{item_id}")
async def delete_research_item(item_id: str):
    """Archive a research item (soft delete)."""
    try:
        ri = await ResearchItem.get(item_id)
        ri.status = "cancelled"
        ri.stage = "archived"
        await ri.save()
        return {"message": "Research item archived", "id": item_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error archiving research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Research execution
# ============================================================


@router.post("/research-items/{item_id}/execute")
async def execute_research(item_id: str):
    """Fire a research item NOW — triggers the configured search engine.

    This endpoint marks the item as 'researching', calls the search engine,
    and returns the result. For streaming results, use the /search/research
    endpoint directly with the item's query and engine.
    """
    try:
        ri = await ResearchItem.get(item_id)
        ri.stage = "researching"
        await ri.save()

        # Build engines list for multi-engine execution
        engines_list = ri.engines if ri.engines else ([ri.engine] if ri.engine else ["perplexity"])

        # Return the research configuration for the frontend to initiate streaming
        return {
            "id": str(ri.id),
            "query": ri.query,
            "engine": ri.engine or "perplexity",
            "engines": engines_list,
            "formatting_instructions": ri.formatting_instructions or "",
            "model_id": ri.model_id,
            "transformation_id": ri.transformation_id,
            "notebook_id": ri.notebook_id,
            "save_as_source": ri.save_as_source,
            "status": "executing",
            "message": f"Research item triggered with {len(engines_list)} engine(s). Use /search/research for streaming results.",
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error executing research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items/{item_id}/complete")
async def complete_research(item_id: str, summary: str = ""):
    """Mark a research item as completed with optional summary."""
    try:
        ri = await ResearchItem.get(item_id)
        await ri.mark_success(summary)
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error completing research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Due items for scheduled execution
# ============================================================


@router.get("/research-items/due/list")
async def list_due_research_items():
    """Get all recurring research items that are due to run."""
    try:
        items = await ResearchItem.get_due_items()
        return [_build_ri_response(i) for i in items]
    except Exception as e:
        logger.error(f"Error listing due research items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Cross-linking
# ============================================================


@router.post("/research-items/{item_id}/link/project")
async def link_project_to_research(item_id: str, data: LinkRequest):
    """Link a project to a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        await ri.link_project(data.target_id)
        return {"message": "Project linked", "research_id": item_id, "project_id": data.target_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error linking project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items/{item_id}/link/customer")
async def link_customer_to_research(item_id: str, data: LinkRequest):
    """Link a customer to a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        await ri.link_customer(data.target_id)
        return {"message": "Customer linked", "research_id": item_id, "customer_id": data.target_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error linking customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research-items/{item_id}/projects")
async def get_research_projects(item_id: str):
    """Get projects linked to a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        projects = await ri.get_linked_projects()
        return [
            {
                "id": str(p.id),
                "name": p.name,
                "stage": p.stage,
                "status": p.status,
                "customer_id": p.customer_id,
            }
            for p in projects
        ]
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error getting research projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))
