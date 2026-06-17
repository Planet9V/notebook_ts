"""
Task domain model for unified task management.
"""
from typing import ClassVar, List, Optional
from pydantic import Field, field_validator

from open_notebook.database.repository import ensure_record_id
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class Task(ObjectModel):
    """Domain model for a task entity."""

    table_name: ClassVar[str] = "task"
    nullable_fields: ClassVar[set[str]] = {
        "description",
        "priority",
        "due_date",
        "project_id",
        "customer_id",
        "notebook_id",
        "assigned_to",
        "created_by",
        "tags",
    }

    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    customer_id: Optional[str] = None
    notebook_id: Optional[str] = None
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise InvalidInputError("Task title cannot be empty")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"todo", "in_progress", "review", "done", "cancelled"}
        if v not in allowed:
            raise InvalidInputError(f"Invalid task status: {v}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"low", "medium", "high", "critical"}
        if v not in allowed:
            raise InvalidInputError(f"Invalid task priority: {v}")
        return v

    def _prepare_save_data(self) -> dict:
        data = super()._prepare_save_data()
        for field in ["project_id", "customer_id", "notebook_id", "assigned_to", "created_by"]:
            if data.get(field):
                data[field] = ensure_record_id(data[field])
        return data
