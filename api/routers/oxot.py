"""
OXOT Sell-Side & CRA Enablement Router
Handles campaign generation, retainer pricing matrices, Gmail outreach, and Google Calendar scheduling.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from loguru import logger
import json

router = APIRouter(prefix="/api/oxot", tags=["OXOT Sell-Side"])

class CampaignGenerationRequest(BaseModel):
    artifact_type: str = Field(..., example="linkedin", description="linkedin | email | proposal | podcast")
    company_name: str = Field("Target Enterprise", example="Aalberts N.V.")
    industry: str = Field("Industrial Manufacturing", example="Industrial OT & Semiconductors")
    product_count: int = Field(3, ge=1, le=20)

class CampaignGenerationResponse(BaseModel):
    artifact_type: str
    content: str
    headline: str
    cta_link: str

class GmailSendRequest(BaseModel):
    recipient_email: str = Field(..., example="ciso@target.com")
    subject: str = Field(..., example="CRA Conformity Retainer Coverage for [Company]")
    body: str = Field(..., example="Hi [Name], ...")
    sender_name: str = Field("OXOT Engineering Team", example="OXOT Engineering Team")

class CalendarScheduleRequest(BaseModel):
    client_name: str = Field(..., example="Enterprise Client")
    client_email: str = Field(..., example="ciso@target.com")
    meeting_date: str = Field("2026-08-18", example="2026-08-18")
    time_slot: str = Field("14:00 CET", example="14:00 CET")
    topic: str = Field("CRA Readiness & Cyber Digital Twin Audit", example="CRA Readiness & Cyber Digital Twin Audit")

@router.get("/offering")
async def get_oxot_offering():
    """Return the official OXOT CRA Readiness Retainer pricing matrix and coverage scope."""
    return {
        "brand": "OXOT B.V.",
        "tagline": "Operational eXcellence in Operational Technology",
        "retainer": {
            "base_fee_eur_range": "€25,000 - €50,000",
            "billing_cycle": "annual",
            "portfolio_discount": "10-35% for 3+ products",
            "fee_policy": "100% credited against engagement costs (advance guarantee, not fee on top)",
            "coverage_scope": "All 3 conformity phases + year after CE mark",
        },
        "value_proposition": [
            {
                "title": "Vulnerability handling",
                "description": "24/7 triage & patch validation for the whole support period",
                "tier": "ALWAYS OXOT",
            },
            {
                "title": "SBOM currency",
                "description": "Continuous tracking of sub-component dependencies as components move",
                "tier": "THE BENCH NETWORK",
            },
            {
                "title": "Substantial-modification assessment",
                "description": "Evaluates every code release to determine re-certification needs",
                "tier": "ALWAYS OXOT",
            },
            {
                "title": "Ten years of technical-file retention",
                "description": "Immutable audit storage compliant with EU 2024/2847 Article 10",
                "tier": "ALWAYS OXOT",
            },
            {
                "title": "Five years of certificate validity",
                "description": "Periodic audits & surveillance between renewal periods",
                "tier": "THE BENCH NETWORK",
            },
            {
                "title": "Cyber Digital Twin Emulator",
                "description": "Virtual OT hardware modeling for zero-risk vulnerability testing",
                "tier": "ALWAYS OXOT",
            },
        ],
    }

@router.post("/campaigns/generate", response_model=CampaignGenerationResponse)
async def generate_oxot_campaign(req: CampaignGenerationRequest):
    """Generate high-converting OXOT selling collateral."""
    discount = 0.35 if req.product_count >= 5 else (0.20 if req.product_count >= 3 else 0.10)
    base_gross = req.product_count * 35000
    net_total = base_gross * (1 - discount)

    if req.artifact_type == "linkedin":
        content = (
            f"🔒 THE CYBER RESILIENCE ACT (EU 2024/2847) IS LIVE: Is {req.company_name} CE-Mark Ready?\n\n"
            f"Many industrial OEMs in {req.industry} assume CE-marking under CRA is a one-time audit. It isn't. "
            f"The obligations don't stop at the CE mark—vulnerability handling, SBOM currency, and 10-year technical file retention "
            f"run for the entire product lifecycle.\n\n"
            f"OXOT provides standing access to senior OT security engineers. Retainer fees are 100% credited against engagement costs.\n\n"
            f"👉 Learn how OXOT covers your conformity year: https://oxot.nl/cra-retainer #OTSecurity #CyberResilienceAct #IEC62443 #OXOT"
        )
        headline = f"CRA Conformity Campaign for {req.company_name}"
    elif req.artifact_type == "email":
        content = (
            f"Subject: CRA Conformity Year Coverage for {req.company_name} ({req.product_count} Product Lines)\n\n"
            f"Hi [FirstName],\n\n"
            f"With Regulation (EU) 2024/2847 in effect across {req.industry}, securing your industrial products requires continuous "
            f"SBOM currency and a 10-year technical file retention guarantee.\n\n"
            f"OXOT's CRA Readiness Retainer (€25K–€50K/yr) guarantees standing access to the senior engineers who built the technical file. "
            f"100% of retainer fees are credited against direct engagement costs.\n\n"
            f"Would you be open to a brief 15-minute engineering review next Tuesday?\n\n"
            f"Best regards,\nOXOT Engineering Team | info@oxot.nl"
        )
        headline = f"Cold Outreach Sequence - {req.company_name}"
    elif req.artifact_type == "proposal":
        content = (
            f"OXOT B.V. - EXECUTIVE PROPOSAL FOR CRA CONFORMITY SERVICES\n"
            f"Client: {req.company_name} ({req.industry})\n"
            f"Scope: {req.product_count} Industrial OT Controller Lines\n"
            f"Base Annual Retainer: €{base_gross:,.0f} EUR\n"
            f"Portfolio Discount ({(discount*100):.0f}%): -€{(base_gross*discount):,.0f} EUR\n"
            f"Net Annual Commitment: €{net_total:,.0f} EUR\n\n"
            f"Coverage Scope:\n"
            f"- 10-Year Immutable Technical File Retention\n"
            f"- 24/7 Triage & Vulnerability Patch Handling\n"
            f"- Continuous SBOM Dependency Tracking\n"
            f"- Annual CE Mark Surveillance Audit Defense"
        )
        headline = f"Executive Proposal - €{net_total:,.0f} EUR Net"
    else:
        content = f"OXOT Podcast Audio Script: Cyber Resilience Act Compliance for {req.company_name}"
        headline = "OXOT Audio Broadcast"

    return CampaignGenerationResponse(
        artifact_type=req.artifact_type,
        content=content,
        headline=headline,
        cta_link="https://oxot.nl/talk-to-an-engineer",
    )

@router.post("/gmail/send")
async def send_gmail_outreach(req: GmailSendRequest):
    """Simulate outreach email dispatch via Gmail automation."""
    logger.info(f"Sending OXOT outreach via Gmail to {req.recipient_email}: {req.subject}")
    return {
        "status": "success",
        "recipient": req.recipient_email,
        "subject": req.subject,
        "message": f"Email successfully dispatched to {req.recipient_email} via OXOT Gmail Automation Engine.",
    }

@router.post("/calendar/schedule")
async def schedule_calendar_meeting(req: CalendarScheduleRequest):
    """Simulate Google Calendar appointment booking for engineering consultation."""
    logger.info(f"Scheduling OXOT Calendar meeting for {req.client_name} on {req.meeting_date} at {req.time_slot}")
    return {
        "status": "scheduled",
        "client_name": req.client_name,
        "client_email": req.client_email,
        "meeting_date": req.meeting_date,
        "time_slot": req.time_slot,
        "calendar_event_link": f"https://calendar.google.com/event?eid=oxot-{req.meeting_date.replace('-','')}",
        "message": f"Consultation meeting booked for {req.meeting_date} at {req.time_slot}. Calendar invite dispatched to {req.client_email}.",
    }
