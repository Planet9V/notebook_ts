from typing import Any, ClassVar, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from open_notebook.domain.base import ObjectModel
from open_notebook.database.repository import ensure_record_id, repo_create, repo_query


class MarketSizingResult(BaseModel):
    category: str
    geography: str
    tam_millions: float = Field(..., description="Total Addressable Market in $M USD")
    sam_millions: float = Field(..., description="Serviceable Available Market in $M USD")
    som_millions: float = Field(..., description="Serviceable Obtainable Market (Year 3-5) in $M USD")
    scenarios: Dict[str, float] = Field(default_factory=dict, description="Monte Carlo sensitivity scenarios (conservative_som, base_som, optimistic_som)")
    methodology: Literal["top_down", "bottom_up", "value_theory", "triangulated"] = "triangulated"
    key_assumptions: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)


class ProspectLead(BaseModel):
    company_name: str
    domain: str
    industry: str
    company_size: str
    score: Literal["Hot", "Warm", "Cold"]
    buying_signal: str
    decision_maker_title: str
    contact_email: Optional[str] = None
    why_prospect: str
    confidence: Literal["High", "Medium", "Low"] = "High"


class ContentArtifact(BaseModel):
    format_type: Literal[
        "audio_podcast",
        "product_brochure",
        "pitch_deck",
        "landing_page",
        "whitepaper_article",
        "linkedin_post",
        "x_thread",
        "ai_proposal"
    ]
    title: str
    content: str
    target_persona: str
    audio_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class MarketAnalysisRecord(ObjectModel):
    table_name: ClassVar[str] = "market_analysis"
    
    title: str
    industry_sector: str
    market_sizing: Optional[MarketSizingResult] = None
    prospects: List[ProspectLead] = Field(default_factory=list)
    content_artifacts: List[ContentArtifact] = Field(default_factory=list)
    notebook_id: Optional[str] = None
    created_by: Optional[str] = None

    @classmethod
    async def get_by_notebook(cls, notebook_id: str) -> List["MarketAnalysisRecord"]:
        results = await repo_query(
            "SELECT * FROM market_analysis WHERE notebook_id = $notebook_id ORDER BY created DESC",
            {"notebook_id": notebook_id}
        )
        return [cls(**r) for r in results]
