from typing import ClassVar, List, Optional

from pydantic import Field, field_validator

from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class Customer(ObjectModel):
    """Domain model for a CRM customer entity.

    Extends ObjectModel to leverage save()/get()/get_all()/delete().
    The underlying SurrealDB table is SCHEMALESS (migration 15),
    so new fields are additive and existing records remain valid.
    """

    table_name: ClassVar[str] = "customer"
    nullable_fields: ClassVar[set[str]] = {
        "annual_revenue",
        "employee_count",
        "last_contact_date",
        "next_followup",
        "import_batch_id",
        "import_source",
    }

    # === Existing fields ===
    name: str
    website: Optional[str] = ""
    description: Optional[str] = ""
    industry: Optional[str] = ""
    primary_sector: Optional[str] = ""
    sectors: Optional[List[str]] = Field(default_factory=list)
    assigned_frameworks: Optional[List[str]] = Field(default_factory=list)
    contacts: Optional[List[dict]] = Field(default_factory=list)

    # === Address fields ===
    street_address: Optional[str] = ""
    street_address_2: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    postal_code: Optional[str] = ""
    country: Optional[str] = "US"

    # === Communication fields ===
    phone: Optional[str] = ""
    phone_alt: Optional[str] = ""
    fax: Optional[str] = ""
    email: Optional[str] = ""

    # === Sales / Ownership fields ===
    salesperson: Optional[str] = ""
    lead_source: Optional[str] = ""
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None

    # === Classification fields ===
    customer_type: Optional[str] = "prospect"
    tier: Optional[str] = "smb"
    status: Optional[str] = "active"

    # === Engagement fields ===
    last_contact_date: Optional[str] = None
    next_followup: Optional[str] = None
    engagement_score: Optional[int] = 0

    # === Social / Web fields ===
    linkedin_url: Optional[str] = ""
    twitter_url: Optional[str] = ""
    facebook_url: Optional[str] = ""

    # === Metadata fields ===
    tags: Optional[List[str]] = Field(default_factory=list)
    internal_notes: Optional[str] = ""
    import_batch_id: Optional[str] = None
    import_source: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Customer name cannot be empty")
        return v
