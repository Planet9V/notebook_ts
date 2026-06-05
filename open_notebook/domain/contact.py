from typing import ClassVar, List, Optional

from pydantic import Field, field_validator

from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class Contact(ObjectModel):
    """Domain model for a CRM contact entity.

    Contacts are first-class entities linked to customers via customer_id
    (string FK, consistent with notebook.customer_id pattern).
    The underlying SurrealDB table is SCHEMAFULL (migration 18).
    """

    table_name: ClassVar[str] = "contact"
    nullable_fields: ClassVar[set[str]] = {
        "customer_id",
        "last_contacted",
        "import_batch_id",
    }

    # Required fields
    first_name: str
    last_name: str

    # Optional fields
    email: Optional[str] = ""
    phone: Optional[str] = ""
    mobile: Optional[str] = ""
    title: Optional[str] = ""
    department: Optional[str] = ""
    seniority: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    customer_id: Optional[str] = None
    location_ids: Optional[List[str]] = Field(default_factory=list)
    status: Optional[str] = "active"
    tags: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = ""
    last_contacted: Optional[str] = None
    source: Optional[str] = "manual"
    import_batch_id: Optional[str] = None

    @property
    def full_name(self) -> str:
        """Returns the contact's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    @field_validator("first_name")
    @classmethod
    def first_name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Contact first name cannot be empty")
        return v

    @field_validator("last_name")
    @classmethod
    def last_name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Contact last name cannot be empty")
        return v
