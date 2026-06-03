"""Shared utility for emitting customer activity events.

Other routers import `emit_activity()` to log touchpoints into the activity timeline.
Uses fire-and-forget pattern: failures are logged but never block the caller.
"""

from loguru import logger

from open_notebook.database.repository import repo_create


async def emit_activity(
    customer_id: str,
    activity_type: str,
    description: str,
    metadata: dict | None = None,
    actor: str = "system",
) -> None:
    """Log a customer activity event. Never raises — logs errors instead."""
    if not customer_id:
        return
    try:
        await repo_create(
            "activity",
            {
                "customer_id": customer_id,
                "activity_type": activity_type,
                "description": description,
                "metadata": metadata or {},
                "actor": actor,
            },
        )
        logger.debug(f"Activity emitted: {activity_type} for {customer_id}")
    except Exception as e:
        logger.warning(f"Failed to emit activity ({activity_type}): {e}")

