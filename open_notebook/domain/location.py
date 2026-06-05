from typing import ClassVar, List, Optional
from pydantic import Field, field_validator
from open_notebook.domain.base import ObjectModel
from open_notebook.exceptions import InvalidInputError


class Location(ObjectModel):
    """Domain model for a Customer Location/Facility entity.

    Locations represent physical or logical facilities belonging to a Customer.
    The underlying SurrealDB table is SCHEMAFULL (migration 40).
    """

    table_name: ClassVar[str] = "location"
    nullable_fields: ClassVar[set[str]] = {
        "customer_id",
        "organization_name",
        "facility_type",
        "address",
        "country",
        "zip_code",
        "latitude",
        "longitude",
        "description",
    }

    # Required fields
    facility_name: str

    # Optional fields
    customer_id: Optional[str] = None
    organization_name: Optional[str] = ""
    facility_type: Optional[str] = ""
    sectors: Optional[List[str]] = Field(default_factory=list)
    address: Optional[str] = ""
    country: Optional[str] = ""
    zip_code: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = ""

    @field_validator("facility_name")
    @classmethod
    def facility_name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise InvalidInputError("Facility name cannot be empty")
        return v

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-90.0 <= v <= 90.0):
            raise InvalidInputError("Latitude must be between -90.0 and 90.0")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (-180.0 <= v <= 180.0):
            raise InvalidInputError("Longitude must be between -180.0 and 180.0")
        return v
