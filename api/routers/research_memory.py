from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

from open_notebook.search.research_memory import ResearchMemory

router = APIRouter()


# ── Request / Response Models ────────────────────────────────────────────────


class SearchRequest(BaseModel):
    """Body for POST /research-memory/search."""

    query: str
    limit: int = 20
    source_type: Optional[str] = None


class DocumentResponse(BaseModel):
    """Single research document returned to the frontend."""

    id: int
    query: str
    title: str
    url: Optional[str] = None
    content: str
    source_type: str
    score: Optional[float] = None
    similarity: Optional[float] = None
    created_at: str


class SearchResponse(BaseModel):
    """Response for search and keyword search endpoints."""

    results: list[DocumentResponse]
    total: int


class BrowseResponse(BaseModel):
    """Response for the paginated browse endpoint."""

    results: list[DocumentResponse]
    total: int
    page: int


class StatsResponse(BaseModel):
    """Response for the stats endpoint."""

    total_documents: int
    source_types: dict[str, int]
    oldest: Optional[str] = None
    newest: Optional[str] = None
    table_size: str


# ── Helpers ──────────────────────────────────────────────────────────────────


def _row_to_doc(row: dict) -> DocumentResponse:
    """Convert a database row dict to a DocumentResponse."""
    return DocumentResponse(
        id=row["id"],
        query=row.get("query", ""),
        title=row.get("title", ""),
        url=row.get("url"),
        content=row.get("content", ""),
        source_type=row.get("source_type", "web"),
        score=row.get("relevance_score") or row.get("rank"),
        similarity=row.get("similarity"),
        created_at=row["created_at"].isoformat() if row.get("created_at") else "",
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/research-memory/stats", response_model=StatsResponse)
async def get_stats():
    """Get research memory statistics."""
    try:
        stats = await ResearchMemory.get_stats()
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error fetching research memory stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching research memory stats: {e}",
        )


@router.post("/research-memory/search", response_model=SearchResponse)
async def search_memory(body: SearchRequest):
    """Search research memory using full-text keyword search.

    Falls back to keyword search since embeddings require a separate
    embedding step that depends on the caller's model choice.
    """
    try:
        rows = await ResearchMemory.keyword_search(
            query=body.query,
            limit=body.limit,
        )
        docs = [_row_to_doc(r) for r in rows]
        return SearchResponse(results=docs, total=len(docs))
    except Exception as e:
        logger.error(f"Error searching research memory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error searching research memory: {e}",
        )


@router.get("/research-memory/browse", response_model=BrowseResponse)
async def browse_memory(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
):
    """Browse stored research results with pagination."""
    try:
        result = await ResearchMemory.browse(
            page=page,
            limit=limit,
            source_type=source_type,
        )
        docs = [_row_to_doc(r) for r in result["results"]]
        return BrowseResponse(
            results=docs,
            total=result["total"],
            page=result["page"],
        )
    except Exception as e:
        logger.error(f"Error browsing research memory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error browsing research memory: {e}",
        )
