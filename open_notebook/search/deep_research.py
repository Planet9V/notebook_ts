"""
Valyu DeepResearch with Non-Blocking Polling

Launches a DeepResearch task using the Valyu SDK, checking status
asynchronously without blocking the FastAPI event loop.
"""

import asyncio
import os
import time
from typing import Any, Callable, Dict, List, Optional

from loguru import logger
from valyu import Valyu

from open_notebook.ai.key_provider import get_api_key

# Human-friendly depth → Valyu depth/mode mapping
DEPTH_MAP: dict[str, str] = {
    "quick": "fast",
    "standard": "standard",
    "deep": "heavy",
    "exhaustive": "max",
}

POLL_INTERVAL_SECONDS = 10


async def run_deep_research(
    query: str,
    depth: str = "standard",
    sources: list[str] | None = None,
    output_format: str = "markdown",
    timeout: int = 300,
    on_progress: Optional[Callable[[str, str], Any]] = None,
) -> dict:
    """Run a Valyu DeepResearch job and poll until completion.

    Args:
        query: The research question or topic.
        depth: Research depth level. One of: quick, standard, deep, exhaustive.
        sources: Optional list of Valyu source identifiers to restrict research.
        output_format: Desired output format (e.g. 'markdown', 'text').
        timeout: Maximum seconds to wait for the research job to finish.
        on_progress: Async callback function signature: (stage, message) -> None.

    Returns:
        Dict with keys: output, sources_used, mode, elapsed_seconds, deepresearch_id.

    Raises:
        TimeoutError: When the job does not complete within the timeout.
        ValueError: When the Valyu API key is missing.
    """
    api_key = await get_api_key("valyu") or os.environ.get("VALYU_API_KEY")
    if not api_key:
        raise ValueError("Valyu API key not configured for DeepResearch")

    valyu_mode = DEPTH_MAP.get(depth, "standard")
    logger.info(
        f"Starting Valyu DeepResearch: query='{query[:80]}...', "
        f"mode={depth}→{valyu_mode}, timeout={timeout}s"
    )

    client = Valyu(api_key=api_key)

    # Build search configuration
    search_config = {}
    if sources:
        search_config["included_sources"] = sources

    create_kwargs: dict = {
        "query": query,
        "mode": valyu_mode,
        "output_formats": [output_format],
    }
    if search_config:
        create_kwargs["search"] = search_config

    # Run the synchronous SDK create call in a thread pool
    task = await asyncio.to_thread(client.deepresearch.create, **create_kwargs)
    
    # Extract deepresearch_id
    task_id = getattr(task, "deepresearch_id", None)
    if not task_id and isinstance(task, dict):
        task_id = task.get("deepresearch_id") or task.get("id")

    if not task_id:
        raise RuntimeError(f"Valyu DeepResearch did not return a task ID. Response: {task}")

    logger.info(f"DeepResearch task created with ID: {task_id}")
    if on_progress:
        await on_progress("running", f"DeepResearch task created with ID: {task_id}")

    start_time = time.monotonic()
    while True:
        elapsed = time.monotonic() - start_time
        if elapsed >= timeout:
            raise TimeoutError(
                f"DeepResearch task {task_id} did not complete within {timeout}s"
            )

        # Poll status in thread pool
        status_resp = await asyncio.to_thread(client.deepresearch.status, task_id)

        # Extract values
        if isinstance(status_resp, dict):
            status_val = status_resp.get("status", "")
            progress_val = status_resp.get("progress")
            error_val = status_resp.get("error")
        else:
            status_val = getattr(status_resp, "status", "")
            progress_val = getattr(status_resp, "progress", None)
            error_val = getattr(status_resp, "error", None)

        logger.debug(f"DeepResearch task {task_id} status: {status_val}")

        # Extract step description if available
        step_msg = ""
        if progress_val:
            if isinstance(progress_val, dict):
                curr = progress_val.get("current_step", 0)
                tot = progress_val.get("total_steps", 0)
            else:
                curr = getattr(progress_val, "current_step", 0)
                tot = getattr(progress_val, "total_steps", 0)
            step_msg = f"Step {curr}/{tot} in progress."

        if status_val == "completed":
            logger.info(f"DeepResearch task {task_id} completed successfully")
            
            if isinstance(status_resp, dict):
                output_text = status_resp.get("output", "")
                raw_sources = status_resp.get("sources", [])
            else:
                output_text = getattr(status_resp, "output", "")
                raw_sources = getattr(status_resp, "sources", [])

            # Normalize sources
            sources_used = []
            for src in (raw_sources or []):
                if isinstance(src, dict):
                    title = src.get("title", "")
                    url = src.get("url", "")
                else:
                    title = getattr(src, "title", "")
                    url = getattr(src, "url", "")
                sources_used.append({"title": title, "url": url})

            return {
                "output": output_text,
                "sources_used": sources_used,
                "mode": valyu_mode,
                "elapsed_seconds": round(elapsed, 2),
                "deepresearch_id": task_id,
            }

        elif status_val in ("failed", "error"):
            err_msg = error_val or "Unknown research failure"
            raise RuntimeError(f"DeepResearch task {task_id} failed: {err_msg}")

        # Emit progress update
        if on_progress:
            progress_msg = f"DeepResearch actively running. {step_msg}".strip()
            await on_progress("running", progress_msg)

        await asyncio.sleep(POLL_INTERVAL_SECONDS)
