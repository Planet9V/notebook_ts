"""
Campaign domain model for marketing campaign planning.
"""
from typing import ClassVar, List, Optional

from pydantic import Field, field_validator

from open_notebook.database.repository import ensure_record_id
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class Campaign(ObjectModel):
    """Domain model for a marketing campaign entity."""

    table_name: ClassVar[str] = "campaign"
    nullable_fields: ClassVar[set[str]] = {
        "description",
        "theme",
        "start_date",
        "end_date",
        "target_audience",
        "channels",
        "customer_id",
        "notebook_id",
    }

    name: str
    description: Optional[str] = None
    theme: Optional[str] = None
    status: str = "draft"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    target_audience: Optional[str] = None
    channels: Optional[List[str]] = Field(default_factory=list)
    customer_id: Optional[str] = None
    notebook_id: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise InvalidInputError("Campaign name cannot be empty")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"draft", "active", "paused", "completed", "archived"}
        if v not in allowed:
            raise InvalidInputError(f"Invalid campaign status: {v}")
        return v

    def _prepare_save_data(self) -> dict:
        data = super()._prepare_save_data()
        for field in ["customer_id", "notebook_id"]:
            if data.get(field):
                data[field] = ensure_record_id(data[field])
        return data
