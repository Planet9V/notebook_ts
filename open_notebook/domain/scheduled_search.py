"""
ScheduledSearch domain model for recurring search automation.

Supports hourly, daily, weekly, monthly intervals.
Linked to notebooks and search engine providers.
"""

from datetime import datetime, timedelta, timezone
from typing import ClassVar, Optional

from open_notebook.domain.base import ObjectModel


INTERVAL_DELTAS = {
    "hourly": timedelta(hours=1),
    "daily": timedelta(days=1),
    "weekly": timedelta(weeks=1),
    "monthly": timedelta(days=30),
}


class ScheduledSearch(ObjectModel):
    table_name: ClassVar[str] = "scheduled_search"
    nullable_fields: ClassVar[set[str]] = {
        "last_run",
        "next_run",
        "last_error",
        "transformation_id",
    }

    name: str
    notebook_id: str
    query: str
    engine: str = "valyu"
    interval: str = "daily"  # hourly, daily, weekly, monthly
    is_active: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    run_count: int = 0
    last_error: Optional[str] = None
    transformation_id: Optional[str] = None
    save_as_source: bool = True

    def compute_next_run(self) -> datetime:
        """Compute the next run time based on interval."""
        delta = INTERVAL_DELTAS.get(self.interval, timedelta(days=1))
        now = datetime.now(timezone.utc)
        if self.last_run:
            return self.last_run + delta
        return now + delta

    async def mark_success(self) -> None:
        """Mark a successful run and schedule the next one."""
        self.last_run = datetime.now(timezone.utc)
        self.run_count += 1
        self.next_run = self.compute_next_run()
        self.last_error = None
        await self.save()

    async def mark_failure(self, error: str) -> None:
        """Record a failed run attempt."""
        self.last_run = datetime.now(timezone.utc)
        self.run_count += 1
        self.next_run = self.compute_next_run()
        self.last_error = error[:500]  # Truncate long errors
        await self.save()

    @classmethod
    async def get_due_searches(cls) -> list["ScheduledSearch"]:
        """Get all active scheduled searches that are due to run."""
        from open_notebook.database.repository import repo_query

        now = datetime.now(timezone.utc).isoformat()
        results = await repo_query(
            "SELECT * FROM scheduled_search WHERE is_active = true "
            "AND (next_run IS NONE OR next_run <= $now) "
            "ORDER BY next_run ASC",
            {"now": now},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_by_notebook(cls, notebook_id: str) -> list["ScheduledSearch"]:
        """Get all scheduled searches for a specific notebook."""
        from open_notebook.database.repository import repo_query

        results = await repo_query(
            "SELECT * FROM scheduled_search WHERE notebook_id = $notebook_id "
            "ORDER BY created DESC",
            {"notebook_id": notebook_id},
        )
        return [cls(**r) for r in results]
