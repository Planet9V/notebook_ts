from typing import Any, ClassVar, Dict, Optional
from pydantic import Field, field_validator
from surrealdb import RecordID

from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class SkillRegistry(ObjectModel):
    """
    Domain model for dynamically loaded skills and their database configurations.
    """
    table_name: ClassVar[str] = "skill_registry"

    name: str
    description: str
    category: str
    enabled: bool = True
    config_vars: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise InvalidInputError("Skill name cannot be empty")
        return v

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None
