"""
ScheduledEpisode domain model for podcast automation.
"""

from datetime import datetime
from typing import ClassVar, Optional

from open_notebook.domain.base import ObjectModel


class ScheduledEpisode(ObjectModel):
    table_name: ClassVar[str] = "scheduled_episode"
    nullable_fields: ClassVar[set[str]] = {
        "last_run",
        "next_run",
    }

    notebook: str
    name: str
    episode_profile: str
    speaker_profile: str
    schedule: str  # cron string
    status: str = "active"  # active, paused, completed, failed
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None

    def _prepare_save_data(self) -> dict:
        from open_notebook.database.repository import ensure_record_id
        data = super()._prepare_save_data()
        if "notebook" in data and data["notebook"]:
            data["notebook"] = ensure_record_id(data["notebook"])
        return data

    @classmethod
    async def get_all_episodes(cls) -> list["ScheduledEpisode"]:
        """Get all scheduled episodes."""
        from open_notebook.database.repository import repo_query
        results = await repo_query("SELECT * FROM scheduled_episode ORDER BY created DESC;")
        return [cls(**r) for r in results]

    @classmethod
    async def get_by_notebook(cls, notebook_id: str) -> list["ScheduledEpisode"]:
        """Get all scheduled episodes for a specific notebook."""
        from open_notebook.database.repository import repo_query
        results = await repo_query(
            "SELECT * FROM scheduled_episode WHERE notebook = $notebook ORDER BY created DESC;",
            {"notebook": notebook_id},
        )
        return [cls(**r) for r in results]
