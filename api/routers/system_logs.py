"""System Logs API Router.

Provides endpoints for monitoring, searching, filtering, and pruning 
system logs stored in the database.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

from open_notebook.database.repository import repo_query

router = APIRouter()

# ── Response Models ──────────────────────────────────────────────────

class SystemLogResponse(BaseModel):
    id: str
    timestamp: str
    level: str
    component: str
    message: str
    module: str
    function: str
    line: int
    exception: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class SystemLogsListResponse(BaseModel):
    logs: List[SystemLogResponse]
    total: int


class DeleteLogsResponse(BaseModel):
    success: bool
    deleted_count: int
    message: str

# ── Helpers ──────────────────────────────────────────────────────────

def _build_log_response(rec: dict) -> SystemLogResponse:
    """Helper to construct SystemLogResponse from a database record."""
    return SystemLogResponse(
        id=str(rec.get("id", "")),
        timestamp=str(rec.get("timestamp", "")),
        level=str(rec.get("level", "INFO")),
        component=str(rec.get("component", "unknown")),
        message=str(rec.get("message", "")),
        module=str(rec.get("module", "")),
        function=str(rec.get("function", "")),
        line=int(rec.get("line", 0)),
        exception=rec.get("exception"),
        extra=rec.get("extra"),
    )

# ── Endpoints ───────────────────────────────────────────────────────

@router.get("/system-logs", response_model=SystemLogsListResponse)
async def get_system_logs(
    component: Optional[str] = Query(None, description="Filter logs by component (api/worker/voice_agent)"),
    level: Optional[str] = Query(None, description="Filter logs by severity level (INFO/WARNING/ERROR/DEBUG)"),
    search: Optional[str] = Query(None, description="Fuzzy match search term within message or exception fields"),
    limit: int = Query(100, ge=1, le=1000, description="Max logs to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Retrieve and query system logs from the database, sorted by timestamp descending."""
    try:
        conditions = []
        params = {}

        if component:
            conditions.append("component = $component")
            params["component"] = component

        if level:
            conditions.append("level = $level")
            params["level"] = level

        if search:
            # SurrealDB fuzzy match check
            conditions.append("(message CONTAINS $search OR exception CONTAINS $search)")
            params["search"] = search

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        # 1. Query matching records
        query_str = (
            f"SELECT * FROM system_log {where_clause} "
            f"ORDER BY timestamp DESC LIMIT $limit START $offset;"
        )
        params["limit"] = limit
        params["offset"] = offset

        records = await repo_query(query_str, params)

        # 2. Count total matches for pagination UI
        count_query = f"SELECT count() FROM system_log {where_clause} GROUP ALL;"
        # Reuse same params without limit/offset
        count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
        count_res = await repo_query(count_query, count_params)
        
        total = count_res[0]["count"] if count_res else 0

        # Construct response
        logs = [_build_log_response(rec) for rec in records]
        return SystemLogsListResponse(logs=logs, total=total)
        
    except Exception as e:
        # Standard sys.stderr write in case database connection itself is causing issues
        import sys
        sys.stderr.write(f"[SystemLogsRouter] Error getting system logs: {e}\n")
        raise HTTPException(status_code=500, detail=f"Failed to fetch system logs: {e}")


@router.delete("/system-logs", response_model=DeleteLogsResponse)
async def delete_system_logs(
    component: Optional[str] = Query(None, description="Optionally clear logs for a specific component"),
    before: Optional[str] = Query(None, description="Optionally clear logs older than an ISO timestamp"),
):
    """Clear or prune old system logs to avoid database bloat."""
    try:
        conditions = []
        params = {}

        if component:
            conditions.append("component = $component")
            params["component"] = component

        if before:
            conditions.append("timestamp < $before")
            params["before"] = before

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        query_str = f"DELETE system_log {where_clause};"
        result = await repo_query(query_str, params)

        deleted_count = len(result) if isinstance(result, list) else 0

        return DeleteLogsResponse(
            success=True,
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} system log records."
        )
    except Exception as e:
        import sys
        sys.stderr.write(f"[SystemLogsRouter] Error clearing system logs: {e}\n")
        raise HTTPException(status_code=500, detail=f"Failed to clear system logs: {e}")
