"""
ResearchItem domain model for Research Intelligence workflow.

Represents a research task linked to a Customer (CIF), Project, and/or
Notebook workspace. Supports one-shot and recurring research with
configurable search engines and GTM Research templates.
"""

from datetime import datetime, timedelta, timezone
from typing import ClassVar, Dict, List, Optional

from loguru import logger
from pydantic import Field, field_validator

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError


INTERVAL_DELTAS = {
    "hourly": timedelta(hours=1),
    "daily": timedelta(days=1),
    "weekly": timedelta(weeks=1),
    "monthly": timedelta(days=30),
}


class ResearchItem(ObjectModel):
    """Domain model for a research intelligence entity.

    Research items are independent workflow entities that can be linked to
    customers (CIF) and projects. They fire search queries against configured
    engines, optionally using GTM Research templates for context.
    """

    table_name: ClassVar[str] = "research_item"
    nullable_fields: ClassVar[set[str]] = {
        "customer_id",
        "project_id",
        "notebook_id",
        "transformation_id",
        "last_run",
        "next_run",
        "last_error",
        "model_id",
        "interval",
        "results_summary",
        "formatting_instructions",
    }

    # Required fields
    name: str
    query: str  # the research query text

    # Optional fields
    description: Optional[str] = ""

    # Linking fields (CIF model)
    customer_id: Optional[str] = None  # FK to customer (CIF)
    project_id: Optional[str] = None  # FK to project
    notebook_id: Optional[str] = None  # FK to notebook workspace
    transformation_id: Optional[str] = None  # FK to GTM Research template

    # Workflow fields
    stage: Optional[str] = "queued"  # queued|researching|analyzing|completed|archived
    status: Optional[str] = "active"  # active|paused|completed|cancelled

    # Search configuration
    engine: Optional[str] = "perplexity"  # backward compat — first item of engines[]
    engines: Optional[List[str]] = Field(default_factory=list)  # multi-engine selection
    model_id: Optional[str] = None  # LLM model override
    formatting_instructions: Optional[str] = ""  # LLM output composition instructions

    # Scheduling
    interval: Optional[str] = None  # None=one-shot, "hourly"|"daily"|"weekly"|"monthly"
    is_recurring: Optional[bool] = False
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    run_count: Optional[int] = 0
    last_error: Optional[str] = None

    # Results
    results_summary: Optional[str] = ""  # last research output summary
    save_as_source: Optional[bool] = True  # save results to notebook

    # Metadata
    tags: Optional[List[str]] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Research item name cannot be empty")
        return v

    @field_validator("query")
    @classmethod
    def query_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Research query cannot be empty")
        return v

    def compute_next_run(self) -> datetime:
        """Compute the next run time based on interval."""
        delta = INTERVAL_DELTAS.get(self.interval or "daily", timedelta(days=1))
        now = datetime.now(timezone.utc)
        if self.last_run:
            return self.last_run + delta
        return now + delta

    async def mark_success(self, summary: str = "") -> None:
        """Mark a successful run and schedule the next one."""
        self.last_run = datetime.now(timezone.utc)
        self.run_count = (self.run_count or 0) + 1
        self.last_error = None
        if summary:
            self.results_summary = summary[:2000]
        if self.is_recurring and self.interval:
            self.next_run = self.compute_next_run()
            self.stage = "queued"
        else:
            self.stage = "completed"
        await self.save()

    async def mark_failure(self, error: str) -> None:
        """Record a failed run attempt."""
        self.last_run = datetime.now(timezone.utc)
        self.run_count = (self.run_count or 0) + 1
        self.last_error = error[:500]
        if self.is_recurring and self.interval:
            self.next_run = self.compute_next_run()
            self.stage = "queued"
        await self.save()

    @classmethod
    async def get_by_customer(cls, customer_id: str) -> list["ResearchItem"]:
        """Get all research items for a specific customer."""
        results = await repo_query(
            "SELECT * FROM research_item WHERE customer_id = $customer_id "
            "ORDER BY created DESC",
            {"customer_id": customer_id},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_by_project(cls, project_id: str) -> list["ResearchItem"]:
        """Get all research items for a specific project."""
        results = await repo_query(
            "SELECT * FROM research_item WHERE project_id = $project_id "
            "ORDER BY created DESC",
            {"project_id": project_id},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_by_stage(cls, stage: str) -> list["ResearchItem"]:
        """Get all research items in a specific stage."""
        results = await repo_query(
            "SELECT * FROM research_item WHERE stage = $stage AND status != 'cancelled' "
            "ORDER BY updated DESC",
            {"stage": stage},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_due_items(cls) -> list["ResearchItem"]:
        """Get all active recurring research items that are due to run."""
        now = datetime.now(timezone.utc).isoformat()
        results = await repo_query(
            "SELECT * FROM research_item WHERE is_recurring = true "
            "AND status = 'active' "
            "AND (next_run IS NONE OR next_run <= $now) "
            "ORDER BY next_run ASC",
            {"now": now},
        )
        return [cls(**r) for r in results]

    async def get_linked_projects(self) -> list:
        """Get projects linked to this research item via graph edges."""
        try:
            results = await repo_query(
                "SELECT <-project_research<-project.* AS items FROM $id",
                {"id": ensure_record_id(self.id)},
            )
            if results and results[0].get("items"):
                from open_notebook.domain.project import Project

                return [Project(**r) for r in results[0]["items"]]
            return []
        except Exception as e:
            logger.error(f"Error fetching linked projects for research {self.id}: {e}")
            raise DatabaseOperationError(e)

    async def link_project(self, project_id: str) -> None:
        """Link this research item to a project (reverse direction)."""
        from open_notebook.domain.project import Project

        project = await Project.get(project_id)
        await project.relate("project_research", self.id)

    async def link_customer(self, customer_id: str) -> None:
        """Link this research item to a customer via graph edge."""
        from open_notebook.domain.customer import Customer

        customer = await Customer.get(customer_id)
        await customer.relate("customer_research", self.id)
