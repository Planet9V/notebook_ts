"""
Project domain model for Project Delivery workflow.

Represents a deliverable project linked to a Customer (CIF) and optionally
to Research Items and a Notebook workspace. Stages track delivery lifecycle.
"""

from datetime import datetime
from typing import ClassVar, Dict, List, Optional

from loguru import logger
from pydantic import Field, field_validator

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError


class Project(ObjectModel):
    """Domain model for a project delivery entity.

    Projects are independent workflow entities linked to customers via
    customer_id. They have their own Kanban stages (planning → closed)
    and can be cross-linked to ResearchItems and Notebooks.
    """

    table_name: ClassVar[str] = "project"
    nullable_fields: ClassVar[set[str]] = {
        "customer_id",
        "notebook_id",
        "start_date",
        "end_date",
        "budget",
        "assigned_to",
    }

    # Required fields
    name: str
    description: Optional[str] = ""

    # Linking fields (CIF model)
    customer_id: Optional[str] = None  # FK to customer (CIF)
    notebook_id: Optional[str] = None  # FK to notebook workspace

    # Workflow fields
    stage: Optional[str] = "planning"  # planning|kickoff|in_progress|review|delivered|closed
    status: Optional[str] = "active"  # active|paused|completed|cancelled

    # Classification fields
    project_type: Optional[str] = ""  # assessment|penetration_test|compliance|consulting
    priority: Optional[str] = "medium"  # low|medium|high|critical

    # Timeline fields
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None

    # Assignment
    assigned_to: Optional[str] = ""

    # Metadata
    tags: Optional[List[str]] = Field(default_factory=list)
    tasks: Optional[List[Dict]] = Field(default_factory=list)  # embedded task list
    progress: Optional[int] = 0  # 0-100 percentage

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Project name cannot be empty")
        return v

    @classmethod
    async def get_by_customer(cls, customer_id: str) -> list["Project"]:
        """Get all projects for a specific customer."""
        results = await repo_query(
            "SELECT * FROM project WHERE customer_id = $customer_id "
            "ORDER BY created DESC",
            {"customer_id": customer_id},
        )
        return [cls(**r) for r in results]

    @classmethod
    async def get_by_stage(cls, stage: str) -> list["Project"]:
        """Get all projects in a specific stage."""
        results = await repo_query(
            "SELECT * FROM project WHERE stage = $stage AND status != 'cancelled' "
            "ORDER BY priority DESC, updated DESC",
            {"stage": stage},
        )
        return [cls(**r) for r in results]

    async def get_linked_research(self) -> list:
        """Get research items linked to this project via graph edges."""
        try:
            results = await repo_query(
                "SELECT ->project_research->research_item.* AS items FROM $id",
                {"id": ensure_record_id(self.id)},
            )
            if results and results[0].get("items"):
                from open_notebook.domain.research_item import ResearchItem

                return [ResearchItem(**r) for r in results[0]["items"]]
            return []
        except Exception as e:
            logger.error(f"Error fetching linked research for project {self.id}: {e}")
            raise DatabaseOperationError(e)

    async def link_research(self, research_item_id: str) -> None:
        """Link a research item to this project."""
        await self.relate("project_research", research_item_id)

    async def add_task(self, task: Dict) -> None:
        """Add a task to the embedded task list."""
        if self.tasks is None:
            self.tasks = []
        task["index"] = len(self.tasks)
        task["status"] = task.get("status", "todo")
        task["created"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.tasks.append(task)
        await self.save()

    async def update_task(self, task_index: int, updates: Dict) -> None:
        """Update a task in the embedded task list."""
        if self.tasks is None or task_index >= len(self.tasks):
            raise InvalidInputError(f"Task index {task_index} not found")
        self.tasks[task_index].update(updates)
        self.tasks[task_index]["updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        await self.save()

    def compute_progress(self) -> int:
        """Compute progress based on completed tasks."""
        if not self.tasks:
            return 0
        completed = sum(1 for t in self.tasks if t.get("status") == "done")
        return int((completed / len(self.tasks)) * 100)
