"""Activity domain model for customer touchpoint logging."""
from typing import Optional

from open_notebook.domain.base import ObjectModel


class Activity(ObjectModel):
    table_name = "activity"

    customer_id: str = ""
    activity_type: str = ""
    description: str = ""
    metadata: Optional[dict] = None
    actor: str = "system"
