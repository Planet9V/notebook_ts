"""
Scheduled Search Router

CRUD endpoints for managing recurring search schedules.
Schedules link to notebooks and execute search queries on configurable intervals.
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    ScheduledSearchCreate,
    ScheduledSearchResponse,
    ScheduledSearchUpdate,
)
from open_notebook.domain.scheduled_search import ScheduledSearch

router = APIRouter()


def _to_response(s: ScheduledSearch) -> ScheduledSearchResponse:
    """Convert domain model to API response."""
    return ScheduledSearchResponse(
        id=s.id or "",
        name=s.name,
        notebook_id=s.notebook_id,
        query=s.query,
        engine=s.engine,
        interval=s.interval,
        is_active=s.is_active,
        last_run=str(s.last_run) if s.last_run else None,
        next_run=str(s.next_run) if s.next_run else None,
        run_count=s.run_count,
        last_error=s.last_error,
        transformation_id=s.transformation_id,
        save_as_source=s.save_as_source,
        created=str(s.created) if s.created else "",
        updated=str(s.updated) if s.updated else "",
    )


@router.get("/scheduled-searches", response_model=List[ScheduledSearchResponse])
async def list_scheduled_searches(notebook_id: str = None):
    """List scheduled searches, optionally filtered by notebook."""
    try:
        if notebook_id:
            searches = await ScheduledSearch.get_by_notebook(notebook_id)
        else:
            searches = await ScheduledSearch.get_all(order_by="created DESC")
        return [_to_response(s) for s in searches]
    except Exception as e:
        logger.error(f"Failed to list scheduled searches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduled-searches", response_model=ScheduledSearchResponse, status_code=201)
async def create_scheduled_search(request: ScheduledSearchCreate):
    """Create a new scheduled search."""
    try:
        # Validate interval
        valid_intervals = {"hourly", "daily", "weekly", "monthly"}
        if request.interval not in valid_intervals:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid interval '{request.interval}'. Must be one of: {', '.join(sorted(valid_intervals))}"
            )

        # Validate engine
        valid_engines = {"valyu", "perplexity", "tavily", "newsapi", "google_scholar", "brave", "hybrid"}
        if request.engine not in valid_engines:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid engine '{request.engine}'. Must be one of: {', '.join(sorted(valid_engines))}"
            )

        scheduled = ScheduledSearch(
            name=request.name,
            notebook_id=request.notebook_id,
            query=request.query,
            engine=request.engine,
            interval=request.interval,
            transformation_id=request.transformation_id,
            save_as_source=request.save_as_source,
            is_active=True,
            next_run=datetime.now(timezone.utc),  # Run immediately on first schedule
        )
        await scheduled.save()
        logger.info(f"Created scheduled search '{request.name}' for notebook {request.notebook_id}")
        return _to_response(scheduled)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create scheduled search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduled-searches/{search_id}", response_model=ScheduledSearchResponse)
async def get_scheduled_search(search_id: str):
    """Get a specific scheduled search."""
    try:
        scheduled = await ScheduledSearch.get(search_id)
        if not scheduled:
            raise HTTPException(status_code=404, detail="Scheduled search not found")
        return _to_response(scheduled)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get scheduled search {search_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/scheduled-searches/{search_id}", response_model=ScheduledSearchResponse)
async def update_scheduled_search(search_id: str, request: ScheduledSearchUpdate):
    """Update a scheduled search."""
    try:
        scheduled = await ScheduledSearch.get(search_id)
        if not scheduled:
            raise HTTPException(status_code=404, detail="Scheduled search not found")

        update_data = request.model_dump(exclude_unset=True)

        if "interval" in update_data:
            valid_intervals = {"hourly", "daily", "weekly", "monthly"}
            if update_data["interval"] not in valid_intervals:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid interval. Must be one of: {', '.join(sorted(valid_intervals))}"
                )

        if "engine" in update_data:
            valid_engines = {"valyu", "perplexity", "tavily", "newsapi", "google_scholar", "brave", "hybrid"}
            if update_data["engine"] not in valid_engines:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid engine. Must be one of: {', '.join(sorted(valid_engines))}"
                )

        for key, value in update_data.items():
            setattr(scheduled, key, value)

        # Recompute next_run if interval changed
        if "interval" in update_data:
            scheduled.next_run = scheduled.compute_next_run()

        await scheduled.save()
        return _to_response(scheduled)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update scheduled search {search_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/scheduled-searches/{search_id}")
async def delete_scheduled_search(search_id: str):
    """Delete a scheduled search."""
    try:
        scheduled = await ScheduledSearch.get(search_id)
        if not scheduled:
            raise HTTPException(status_code=404, detail="Scheduled search not found")
        await scheduled.delete()
        return {"message": f"Scheduled search '{scheduled.name}' deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete scheduled search {search_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduled-searches/{search_id}/run")
async def trigger_scheduled_search(search_id: str):
    """Manually trigger a scheduled search to run immediately."""
    try:
        scheduled = await ScheduledSearch.get(search_id)
        if not scheduled:
            raise HTTPException(status_code=404, detail="Scheduled search not found")

        from open_notebook.domain.scheduled_search_worker import execute_scheduled_search
        result = await execute_scheduled_search(scheduled)
        return {"message": f"Scheduled search '{scheduled.name}' executed", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger scheduled search {search_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduled-searches/due/list", response_model=List[ScheduledSearchResponse])
async def list_due_searches():
    """List all scheduled searches that are due to run."""
    try:
        due = await ScheduledSearch.get_due_searches()
        return [_to_response(s) for s in due]
    except Exception as e:
        logger.error(f"Failed to list due searches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduled-searches/run-due")
async def run_due_searches():
    """Execute all scheduled searches that are due. Intended for cron/external scheduler."""
    try:
        from open_notebook.domain.scheduled_search_worker import run_all_due_searches
        results = await run_all_due_searches()
        return {
            "message": f"Executed {len(results)} scheduled searches",
            "results": results,
        }
    except Exception as e:
        logger.error(f"Failed to run due searches: {e}")
        raise HTTPException(status_code=500, detail=str(e))
