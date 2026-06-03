from typing import ClassVar, List, Optional

from pydantic import Field

from open_notebook.domain.base import ObjectModel, RecordModel


class Transformation(ObjectModel):
    table_name: ClassVar[str] = "transformation"
    nullable_fields: ClassVar[set[str]] = {
        "search_engine",
        "search_model_id",
        "color_tag",
        "target_context",
    }

    name: str
    title: str
    description: str
    prompt: str
    apply_default: bool

    # GTM Research extension fields
    category: Optional[str] = "transformation"  # "transformation" | "gtm_research"
    search_engine: Optional[str] = None  # "perplexity" | "valyu" | "tavily" | etc.
    search_model_id: Optional[str] = None  # specific model override for this template
    color_tag: Optional[str] = None  # e.g. "sky" for light blue visual tagging
    target_context: Optional[str] = None  # "market" | "presales" | "org_gtm" | "tech_gtm"


class DefaultPrompts(RecordModel):
    record_id: ClassVar[str] = "open_notebook:default_prompts"
    transformation_instructions: Optional[str] = Field(
        None, description="Instructions for executing a transformation"
    )
