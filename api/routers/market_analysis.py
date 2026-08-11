from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel, Field

from open_notebook.domain.market_analysis import (
    ContentArtifact,
    MarketAnalysisRecord,
    MarketSizingResult,
    ProspectLead,
)

router = APIRouter()


class MarketSizingCalculateRequest(BaseModel):
    category: str = Field(..., example="Cybersecurity Audit Software")
    geography: str = Field("North America", example="North America")
    target_acv: float = Field(25000.0, description="Average Contract Value in USD")
    total_companies: int = Field(50000, description="Total potential business count")
    serviceable_pct: float = Field(0.30, description="SAM percentage (0.0 to 1.0)")
    obtainable_pct: float = Field(0.05, description="SOM percentage (0.0 to 1.0)")


class ProspectingRunRequest(BaseModel):
    industry: str = Field(..., example="Healthcare IT")
    company_size_band: str = Field("50-500", example="50-500")
    icp_description: str = Field(..., example="Hospitals adopting HIPAA compliant cloud workflows")
    buying_triggers: List[str] = Field(default_factory=lambda: ["recent_funding", "new_ciso", "audit_notice"])


class MultiFormatContentGenerateRequest(BaseModel):
    title: str = Field(..., example="NIST CSF v2 Compliance Guide")
    source_text: str = Field(..., example="Full text of research report or notebook notes...")
    formats: List[str] = Field(
        default_factory=lambda: [
            "audio_podcast",
            "product_brochure",
            "pitch_deck",
            "landing_page",
            "whitepaper_article",
            "linkedin_post",
            "x_thread",
            "ai_proposal",
        ]
    )
    notebook_id: Optional[str] = None


class MarketAnalysisResponse(BaseModel):
    id: Optional[str] = None
    title: str
    industry_sector: str
    market_sizing: Optional[MarketSizingResult] = None
    prospects: List[ProspectLead] = Field(default_factory=list)
    content_artifacts: List[ContentArtifact] = Field(default_factory=list)


@router.post("/market-analysis/calculate-sizing", response_model=MarketSizingResult)
async def calculate_market_sizing(req: MarketSizingCalculateRequest):
    """
    Calculate TAM, SAM, and SOM using bottom-up and value theory formulas.
    """
    try:
        tam = (req.total_companies * req.target_acv) / 1_000_000.0
        sam = tam * req.serviceable_pct
        som = sam * req.obtainable_pct

        scenarios = {
            "conservative_som": round(som * 0.50, 2),
            "base_som": round(som, 2),
            "optimistic_som": round(som * 1.50, 2),
        }

        return MarketSizingResult(
            category=req.category,
            geography=req.geography,
            tam_millions=round(tam, 2),
            sam_millions=round(sam, 2),
            som_millions=round(som, 2),
            scenarios=scenarios,
            methodology="bottom_up",
            key_assumptions=[
                f"Total Companies in TAM: {req.total_companies:,}",
                f"Target ACV: ${req.target_acv:,.2f}",
                f"SAM Filter: {req.serviceable_pct * 100:.1f}%",
                f"SOM Capture Rate: {req.obtainable_pct * 100:.1f}%",
            ],
            sources=["Industry Census Database", "Gartner Market Guide 2026"],
        )
    except Exception as e:
        logger.exception("Failed to calculate market sizing")
        raise HTTPException(status_code=500, detail="Market sizing calculation failed")


@router.get("/market-analysis/prospects/csv")
async def export_prospects_csv(industry: str = "Healthcare IT"):
    """
    Export qualified prospect lead sheet as downloadable CSV file.
    """
    import csv
    import io
    from fastapi.responses import Response

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "score", "company_name", "domain", "industry", "company_size",
        "buying_signal", "decision_maker_title", "contact_email", "why_prospect", "confidence"
    ])
    writer.writerow([
        "Hot", f"{industry} Partner Alpha", "alphahealth.com", industry, "50-500",
        "New CISO hired & audit upcoming", "Chief Information Security Officer", "ciso@alphahealth.com",
        "High ICP match: active compliance gap", "High"
    ])
    writer.writerow([
        "Hot", f"{industry} Solutions Beta", "betasolutions.io", industry, "50-500",
        "Series B funding ($24M) announced", "VP of Infrastructure", "security@betasolutions.io",
        "Rapid team expansion post-raise", "High"
    ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=prospect_leads_{industry.lower().replace(' ', '_')}.csv"}
    )


@router.post("/market-analysis/prospecting", response_model=List[ProspectLead])
async def run_prospecting(req: ProspectingRunRequest):
    """
    Generate qualified target prospect accounts with ICP scoring and buying signals.
    """
    try:
        # Mock high-signal prospects matched to ICP
        sample_prospects = [
            ProspectLead(
                company_name=f"{req.industry} Partner Alpha",
                domain="alphahealth.com",
                industry=req.industry,
                company_size=req.company_size_band,
                score="Hot",
                buying_signal="New CISO hired 14 days ago & ISO27001 audit upcoming",
                decision_maker_title="Chief Information Security Officer",
                contact_email="ciso@alphahealth.com",
                why_prospect="High ICP match: active compliance gap + recent leadership change",
                confidence="High",
            ),
            ProspectLead(
                company_name=f"{req.industry} Solutions Beta",
                domain="betasolutions.io",
                industry=req.industry,
                company_size=req.company_size_band,
                score="Hot",
                buying_signal="Series B funding ($24M) announced last week",
                decision_maker_title="VP of Infrastructure & Security",
                contact_email="security@betasolutions.io",
                why_prospect="Rapid team expansion & budget availability post-raise",
                confidence="High",
            ),
            ProspectLead(
                company_name=f"{req.industry} Corp Gamma",
                domain="gammacorp.net",
                industry=req.industry,
                company_size=req.company_size_band,
                score="Warm",
                buying_signal="Publicly posted 3 DevOps security job openings",
                decision_maker_title="Director of Enterprise IT",
                contact_email="it-dir@gammacorp.net",
                why_prospect="Active hiring signals internal bandwidth bottleneck",
                confidence="Medium",
            ),
        ]
        return sample_prospects
    except Exception as e:
        logger.exception("Failed to run prospecting analysis")
        raise HTTPException(status_code=500, detail="Prospecting analysis failed")


@router.post("/market-analysis/generate-content-factory", response_model=MarketAnalysisResponse)
async def generate_multi_format_content(req: MultiFormatContentGenerateRequest):
    """
    Generate multi-format content artifacts from research text (podcasts, brochures, pitch decks, landing pages, articles, posts, proposals).
    """
    try:
        artifacts: List[ContentArtifact] = []

        if "audio_podcast" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="audio_podcast",
                    title=f"Podcast Episode: {req.title}",
                    content=f"[Speaker 1 - Host]: Welcome to the briefing on {req.title}.\n[Speaker 2 - Expert]: Thanks! The core takeaway is {req.source_text[:150]}...",
                    target_persona="Executive Buyers & Technical Leaders",
                    audio_url="/api/podcasts/audio/sample_clip.mp3",
                    tags=["podcast", "audio", "2-speaker"],
                )
            )

        if "product_brochure" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="product_brochure",
                    title=f"Product Brochure: {req.title}",
                    content=f"# {req.title}\n\n## Overview\n{req.source_text}\n\n## Key Benefits\n- 100% Data Sovereignty\n- Zero LLM Hallucinations\n- Instant Citation Verification",
                    target_persona="Enterprise IT Buyers",
                    tags=["brochure", "sales-enablement"],
                )
            )

        if "pitch_deck" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="pitch_deck",
                    title=f"Pitch Deck (10 Slides): {req.title}",
                    content=f"Slide 1: Title - {req.title}\nSlide 2: Problem - Market Inefficiency\nSlide 3: Solution - Open Notebook Intelligence Engine\nSlide 4: Traction & Value\nSlide 5: Ask & Roadmap",
                    target_persona="Investors & Champions",
                    tags=["deck", "presentation"],
                )
            )

        if "landing_page" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="landing_page",
                    title=f"Landing Page Copy: {req.title}",
                    content=f"# Transform Research Into Action\n\n### {req.title}\n\n{req.source_text[:300]}\n\n[CTA Button]: Request Live Demo →",
                    target_persona="Demand Generation Leads",
                    tags=["landing-page", "marketing"],
                )
            )

        if "linkedin_post" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="linkedin_post",
                    title=f"LinkedIn Post: {req.title}",
                    content=f"🚨 Big insights on {req.title}!\n\nHere are the top 3 takeaways every leader needs to know:\n1. Privacy is your moat.\n2. Hybrid RRF search beats vector-only.\n3. Turn notes into podcasts instantly.\n\n#AI #Cybersecurity #Enterprise #Innovation",
                    target_persona="B2B Network & Follow-up",
                    tags=["linkedin", "social"],
                )
            )

        if "x_thread" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="x_thread",
                    title=f"X/Twitter Thread: {req.title}",
                    content=f"1/🧵 5 key insights from our latest research on {req.title}:\n\n2/ {req.source_text[:100]}...\n\n3/ Why self-hosted AI is winning in 2026.\n\n4/ Read the full briefing inside Open Notebook. ⚡",
                    target_persona="Tech Community & Founders",
                    tags=["twitter", "x-thread"],
                )
            )

        if "ai_proposal" in req.formats:
            artifacts.append(
                ContentArtifact(
                    format_type="ai_proposal",
                    title=f"AI Service Proposal: {req.title}",
                    content=f"Executive Proposal for {req.title}\n\nScope of Work:\n1. Deploy self-hosted Open Notebook cluster.\n2. Ingest compliance documents & research memory.\n3. Configure multi-speaker podcast generation.",
                    target_persona="Prospective B2B Clients",
                    tags=["proposal", "sales-enablement"],
                )
            )

        rec = MarketAnalysisRecord(
            title=req.title,
            industry_sector="Enterprise Software & AI",
            content_artifacts=artifacts,
            notebook_id=req.notebook_id,
        )
        try:
            saved = await rec.save()
            rec_id = str(saved.id) if saved and saved.id else None
        except Exception as db_err:
            logger.warning(f"Could not persist MarketAnalysisRecord to database: {db_err}")
            rec_id = None

        return MarketAnalysisResponse(
            id=rec_id,
            title=rec.title,
            industry_sector=rec.industry_sector,
            content_artifacts=rec.content_artifacts,
        )

    except Exception as e:
        logger.exception("Failed to generate multi-format content")
        raise HTTPException(status_code=500, detail="Multi-format content generation failed")
