"""
Unified Valyu Search

Replaces Tavily, Perplexity, DuckDuckGo, and NewsAPI with a single
Valyu SDK call. Context-aware routing maps business domains to the
correct Valyu search_type and source filters. A Brave fallback fires
automatically when Valyu is unreachable.
"""

import os

import httpx
from loguru import logger
from valyu import Valyu

from open_notebook.ai.key_provider import get_api_key

# Context → Valyu parameter mapping
CONTEXT_ROUTES: dict[str, dict] = {
    "compliance": {
        "search_type": "proprietary",
        "sources": ["sec_filings", "legal"],
    },
    "academic": {
        "search_type": "proprietary",
        "sources": ["arxiv", "pubmed", "semantic_scholar"],
    },
    "financial": {
        "search_type": "proprietary",
        "sources": ["fred", "bls", "sec_filings"],
    },
    "biomedical": {
        "search_type": "proprietary",
        "sources": ["pubmed", "clinicaltrials"],
    },
    "news": {
        "search_type": "news",
        "sources": [],
    },
    "web": {
        "search_type": "all",
        "sources": [],
    },
}


def _resolve_route(context: str) -> dict:
    """Map a business context string to Valyu search parameters."""
    return CONTEXT_ROUTES.get(context, {"search_type": "all", "sources": []})


def _normalize_results(raw_results: list) -> list[dict]:
    """Convert raw Valyu result objects to a flat list of dicts."""
    normalized = []
    for r in raw_results:
        if isinstance(r, dict):
            entry = r
        elif hasattr(r, "model_dump"):
            entry = r.model_dump()
        elif hasattr(r, "dict"):
            entry = r.dict()
        elif hasattr(r, "__dict__"):
            entry = vars(r)
        else:
            entry = {}

        normalized.append(
            {
                "title": entry.get("title", ""),
                "url": entry.get("url", ""),
                "content": entry.get("content", ""),
                "score": entry.get("relevance_score", entry.get("score", 0.0)),
                "source": entry.get("source", ""),
            }
        )
    return normalized


async def _brave_fallback(query: str, max_results: int = 10) -> list[dict]:
    """Fallback search using the Brave Web Search API via httpx."""
    brave_key = await get_api_key("brave") or os.environ.get("BRAVE_API_KEY")
    if not brave_key:
        logger.warning("Brave API key not configured; fallback unavailable")
        return []

    logger.info(f"Falling back to Brave search for: {query}")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={
                    "X-Subscription-Token": brave_key,
                    "Accept": "application/json",
                },
                params={"q": query, "count": max_results},
            )
            if resp.status_code != 200:
                logger.warning(f"Brave returned status {resp.status_code}")
                return []

            data = resp.json()
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("description", ""),
                    "score": 0.0,
                    "source": "brave",
                }
                for r in data.get("web", {}).get("results", [])[:max_results]
            ]
    except Exception as exc:
        logger.error(f"Brave fallback search failed: {exc}")
        return []


async def run_valyu_search(
    query: str,
    context: str = "general",
    max_results: int = 10,
    search_type: str | None = None,
) -> list[dict]:
    """Run a search through the Valyu SDK with context-aware routing.

    Tries Valyu first; falls back to Brave if Valyu is unavailable or errors.

    Args:
        query: The search query string.
        context: Business context that selects search_type and sources.
                 One of: compliance, academic, financial, biomedical, news, web.
                 Defaults to 'general' which maps to search_type='all'.
        max_results: Maximum number of results to return.
        search_type: Explicit override for Valyu search_type. When set,
                     the context-based search_type is ignored.

    Returns:
        Normalized list of dicts with keys: title, url, content, score, source.
    """
    api_key = await get_api_key("valyu") or os.environ.get("VALYU_API_KEY")
    if not api_key:
        logger.warning("Valyu API key not configured; trying Brave fallback")
        return await _brave_fallback(query, max_results)

    route = _resolve_route(context)
    resolved_type = search_type or route["search_type"]

    logger.info(
        f"Valyu search: query='{query[:60]}...', context={context}, "
        f"search_type={resolved_type}, sources={route['sources']}"
    )

    try:
        client = Valyu(api_key=api_key)
        kwargs: dict = {
            "query": query,
            "search_type": resolved_type,
            "max_num_results": max_results,
        }
        if route["sources"]:
            kwargs["included_sources"] = route["sources"]

        response = client.search(**kwargs)

        raw = []
        if hasattr(response, "results"):
            raw = response.results
        elif isinstance(response, dict):
            raw = response.get("results", [])

        results = _normalize_results(raw)
        logger.info(f"Valyu returned {len(results)} results")
        return results

    except Exception as exc:
        logger.error(f"Valyu search failed: {exc}; falling back to Brave")
        return await _brave_fallback(query, max_results)
