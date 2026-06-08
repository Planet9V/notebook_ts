"""
Scheduled Search Worker

Executes scheduled search queries using the configured search engine,
saves results as sources in the linked notebook, and tracks run status.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List

from loguru import logger


async def execute_scheduled_search(scheduled_search) -> Dict[str, Any]:
    """
    Execute a single scheduled search.

    1. Runs the search using the configured engine
    2. Saves results as a source in the notebook (if save_as_source=True)
    3. Updates run tracking (last_run, next_run, run_count)

    Returns a result dict with status and details.
    """
    from open_notebook.ai.key_provider import get_api_key

    import httpx

    engine = scheduled_search.engine
    query = scheduled_search.query
    notebook_id = scheduled_search.notebook_id

    logger.info(
        f"Executing scheduled search '{scheduled_search.name}' "
        f"(engine={engine}, query='{query[:50]}...')"
    )

    try:
        search_results = await _run_search(engine, query)

        if not search_results:
            await scheduled_search.mark_success()
            return {
                "status": "success",
                "message": "No results found",
                "results_count": 0,
            }

        # Save as source if configured
        source_id = None
        if scheduled_search.save_as_source:
            source_id = await _save_results_as_source(
                notebook_id=notebook_id,
                query=query,
                engine=engine,
                results=search_results,
                transformation_id=scheduled_search.transformation_id,
            )

        await scheduled_search.mark_success()

        return {
            "status": "success",
            "results_count": len(search_results),
            "source_id": source_id,
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Scheduled search '{scheduled_search.name}' failed: {error_msg}")
        await scheduled_search.mark_failure(error_msg)
        return {
            "status": "error",
            "message": error_msg,
        }


async def _run_search(engine: str, query: str) -> List[Dict[str, Any]]:
    """Run a search against the specified engine. Returns list of result dicts.

    Valyu-family engines (valyu, valyu_web, valyu_news, valyu_academic,
    valyu_financial, valyu_sec) are routed through the unified Valyu search
    module. Brave is handled directly via httpx.
    """
    import os

    import httpx

    from open_notebook.ai.key_provider import get_api_key
    from open_notebook.search.valyu_search import run_valyu_search

    # Map engine name → Valyu context
    VALYU_ENGINE_CONTEXTS: dict[str, str] = {
        "valyu": "web",
        "valyu_web": "web",
        "valyu_news": "news",
        "valyu_academic": "academic",
        "valyu_financial": "financial",
        "valyu_sec": "compliance",
    }

    if engine in VALYU_ENGINE_CONTEXTS:
        context = VALYU_ENGINE_CONTEXTS[engine]
        results = await run_valyu_search(query=query, context=context, max_results=8)
        return [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
            }
            for r in results
        ]

    elif engine == "brave":
        api_key = await get_api_key("brave") or os.environ.get("BRAVE_API_KEY")
        if not api_key:
            raise ValueError("Brave API key not configured")
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers={"X-Subscription-Token": api_key, "Accept": "application/json"},
                params={"q": query, "count": 8},
            )
            if resp.status_code == 200:
                data = resp.json()
                return [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": r.get("description", ""),
                    }
                    for r in data.get("web", {}).get("results", [])
                ]
        return []

    else:
        raise ValueError(f"Unsupported search engine: {engine}")

    return []


async def _save_results_as_source(
    notebook_id: str,
    query: str,
    engine: str,
    results: List[Dict[str, Any]],
    transformation_id: str = None,
) -> str:
    """Save search results as a text source in the notebook."""
    from open_notebook.domain.notebook import Source

    # Build markdown content from results
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Scheduled Search Results",
        f"**Query:** {query}",
        f"**Engine:** {engine}",
        f"**Date:** {now_str}",
        f"**Results:** {len(results)}",
        "",
        "---",
        "",
    ]

    for i, r in enumerate(results, 1):
        title = r.get("title", f"Result {i}")
        url = r.get("url", "")
        content = r.get("content", "")
        lines.append(f"## {i}. {title}")
        if url:
            lines.append(f"**URL:** [{url}]({url})")
        if content:
            lines.append(f"\n{content}")
        lines.append("")

    full_text = "\n".join(lines)

    source = Source(
        title=f"[{engine.upper()}] {query[:80]} ({now_str})",
        full_text=full_text,
    )
    await source.save()

    # Link source to notebook
    if notebook_id:
        await source.relate("reference", notebook_id)

    return source.id


async def run_all_due_searches() -> List[Dict[str, Any]]:
    """Execute all due scheduled searches. Called by external cron or /run-due endpoint."""
    from open_notebook.domain.scheduled_search import ScheduledSearch

    due_searches = await ScheduledSearch.get_due_searches()
    logger.info(f"Found {len(due_searches)} due scheduled searches")

    results = []
    for scheduled in due_searches:
        result = await execute_scheduled_search(scheduled)
        result["search_id"] = scheduled.id
        result["search_name"] = scheduled.name
        results.append(result)

    return results
