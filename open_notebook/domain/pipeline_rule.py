from typing import ClassVar, Optional
from open_notebook.domain.base import ObjectModel

class PipelineRule(ObjectModel):
    table_name: ClassVar[str] = "pipeline_rule"
    stage: str
    action_type: str  # "crawl" or "search"
    prompt: str
    query_template: Optional[str] = ""
    model_override: Optional[str] = None
    is_active: bool = True
