#!/usr/bin/env python3
"""Seed consulting content templates into Tetrel Notebook.

Usage:
    python scripts/seed_consulting_templates.py [--api-url http://localhost:5055]
    python scripts/seed_consulting_templates.py http://localhost:5055
"""
import sys

import requests

API_URL = "http://localhost:5055"
for arg in sys.argv[1:]:
    if arg.startswith("--api-url"):
        continue  # value follows
    elif arg.startswith("http"):
        API_URL = arg.rstrip("/")

TEMPLATES = [
    {
        "name": "linkedin_thought_leadership",
        "title": "LinkedIn Thought Leadership Post",
        "description": "Generate a concise, engaging LinkedIn post from source material with key insights and a call-to-action.",
        "category": "consulting",
        "color_tag": "blue",
        "apply_default": False,
        "prompt": (
            "Generate a 150-300 word LinkedIn post from the provided content. "
            "Use a professional but engaging tone. Start with a hook that grabs attention. "
            "Include 2-3 key insights drawn directly from the source material. "
            "End with a call-to-action or thought-provoking question to encourage engagement. "
            "Use line breaks for readability — no long walls of text. "
            "Add 3-5 relevant hashtags at the end."
        ),
    },
    {
        "name": "executive_summary",
        "title": "Executive Summary",
        "description": "Produce a concise executive summary using the Situation-Complication-Resolution framework.",
        "category": "consulting",
        "color_tag": "purple",
        "apply_default": False,
        "prompt": (
            "Produce a concise executive summary (250-400 words) from the source material. "
            "Structure it as: "
            "Situation (current state and context), "
            "Complication (why action is needed now), "
            "Resolution (recommended approach and rationale), "
            "Next Steps (concrete actions with owners if identifiable). "
            "Use clear business language free of jargon. "
            "Lead with the single most important finding or recommendation."
        ),
    },
    {
        "name": "case_study_draft",
        "title": "Client Case Study Draft",
        "description": "Draft a client case study following the Challenge-Approach-Results-Takeaways structure.",
        "category": "consulting",
        "color_tag": "green",
        "apply_default": False,
        "prompt": (
            "Draft a client case study from the provided material. "
            "Structure: "
            "Challenge (what the client faced and why it mattered), "
            "Approach (what was done, methodology, and key decisions), "
            "Results (measurable outcomes — use specific metrics where available), "
            "Key Takeaways (lessons applicable to similar situations). "
            "Use specific details and data points where available. "
            "Keep to 400-600 words. Write in third person. "
            "Anonymize client details unless explicitly provided for publication."
        ),
    },
    {
        "name": "meeting_recap",
        "title": "Meeting Recap & Action Items",
        "description": "Create a structured meeting recap with discussion points, decisions, and action items.",
        "category": "consulting",
        "color_tag": "amber",
        "apply_default": False,
        "prompt": (
            "Create a structured meeting recap from the provided notes or transcript. "
            "Include the following sections: "
            "Date/Attendees (if mentioned in the source), "
            "Key Discussion Points (bulleted, grouped by topic), "
            "Decisions Made (clearly stated with any conditions), "
            "Action Items (with owner and due date if identifiable, formatted as checkboxes), "
            "Next Steps/Follow-up (including next meeting date if mentioned). "
            "Keep professional and concise. Flag any unresolved items."
        ),
    },
    {
        "name": "weekly_status_report",
        "title": "Weekly Status Report",
        "description": "Generate a professional weekly status report with accomplishments, blockers, and priorities.",
        "category": "consulting",
        "color_tag": "sky",
        "apply_default": False,
        "prompt": (
            "Generate a professional weekly status report from the provided material. "
            "Structure: "
            "Accomplishments This Week (completed items with brief impact notes), "
            "In Progress (active work with percentage complete if estimable), "
            "Blockers/Risks (issues impeding progress, with severity), "
            "Next Week's Priorities (ranked by importance), "
            "Key Metrics/Milestones (any quantitative progress indicators). "
            "Use bullet points throughout. "
            "Highlight items needing client or leadership attention with an [ACTION NEEDED] prefix."
        ),
    },
    {
        "name": "competitive_brief",
        "title": "Competitive Intelligence Brief",
        "description": "Analyze source material into a structured competitive intelligence brief with strategic recommendations.",
        "category": "gtm_research",
        "target_context": "market",
        "color_tag": "red",
        "apply_default": False,
        "prompt": (
            "Analyze the provided material and produce a competitive intelligence brief. "
            "Cover the following sections: "
            "Competitor Overview (company profile, size, market presence), "
            "Strengths (what they do well, proven advantages), "
            "Weaknesses (gaps, known issues, customer complaints), "
            "Market Positioning (target segments, messaging, brand perception), "
            "Pricing Strategy (pricing model and tiers if available), "
            "Key Differentiators vs Our Offering (head-to-head comparison), "
            "Strategic Recommendations (actionable next steps to compete effectively). "
            "Be specific and cite sources from the provided material where possible."
        ),
    },
    {
        "name": "risk_assessment_summary",
        "title": "Risk Assessment Summary",
        "description": "Synthesize information into a risk assessment with likelihood, impact, and mitigation strategies.",
        "category": "consulting",
        "color_tag": "orange",
        "apply_default": False,
        "prompt": (
            "Synthesize the provided information into a risk assessment summary. "
            "For each identified risk, provide: "
            "Description (clear statement of the risk), "
            "Likelihood (High/Medium/Low), "
            "Impact (High/Medium/Low), "
            "Risk Score (Likelihood × Impact, e.g. H×M = High-Medium), "
            "Mitigation Strategy (specific actions to reduce risk), "
            "Owner/Timeline (who should act and by when, if identifiable). "
            "Present risks in a table format where possible. "
            "Include an overall risk posture statement at the top summarizing the aggregate risk profile."
        ),
    },
    {
        "name": "proposal_outline",
        "title": "Engagement Proposal Outline",
        "description": "Generate a structured engagement proposal outline from research and notes.",
        "category": "consulting",
        "color_tag": "violet",
        "apply_default": False,
        "prompt": (
            "From the research and notes provided, generate a structured engagement proposal outline. "
            "Include these sections: "
            "Problem Statement (the core challenge to solve), "
            "Proposed Solution (high-level approach), "
            "Scope of Work (broken into phases with key activities), "
            "Timeline (estimated duration per phase), "
            "Team Structure (roles needed), "
            "Investment Summary (how to frame the pricing conversation), "
            "Expected Outcomes (measurable results the client can expect), "
            "Why Us (differentiators and relevant experience). "
            "Keep each section to 2-4 sentences as a starting framework for expansion."
        ),
    },
    {
        "name": "twitter_thread",
        "title": "X/Twitter Thread",
        "description": "Convert content into a compelling X/Twitter thread with narrative structure.",
        "category": "consulting",
        "color_tag": "cyan",
        "apply_default": False,
        "prompt": (
            "Convert the provided content into a compelling X/Twitter thread of 5-8 tweets. "
            "Start with a strong hook tweet that creates curiosity or states a bold claim. "
            "Each tweet must be under 280 characters. "
            "Use numbered format (1/, 2/, etc.) for clear thread structure. "
            "Build narrative tension — each tweet should make the reader want the next one. "
            "Include one tweet with a concrete example or data point. "
            "End with a clear takeaway or call-to-action. "
            "No hashtags except optionally in the last tweet (max 2)."
        ),
    },
    {
        "name": "newsletter_section",
        "title": "Email Newsletter Section",
        "description": "Transform content into a newsletter-ready section with headline, insights, and CTA.",
        "category": "consulting",
        "color_tag": "emerald",
        "apply_default": False,
        "prompt": (
            "Transform the provided content into a newsletter-ready section of 200-300 words. "
            "Start with a compelling headline that promises value. "
            "Write in a conversational but expert tone — authoritative without being stiff. "
            "Include 1-2 key insights with brief explanation of why they matter. "
            "Use short paragraphs (2-3 sentences max) for email readability. "
            "Bold key phrases that a skimmer should catch. "
            "End with a relevant call-to-action (read more, schedule a call, download a resource, etc.). "
            "Format for email: avoid complex formatting, keep it clean and scannable."
        ),
    },
]


def seed():
    created = 0
    skipped = 0
    errors = 0

    # Check existing to avoid duplicates
    try:
        resp = requests.get(f"{API_URL}/api/transformations", timeout=10)
        resp.raise_for_status()
        existing = resp.json()
    except requests.ConnectionError:
        print(f"ERROR: Cannot connect to API at {API_URL}")
        print("       Is the server running?")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to fetch existing transformations: {e}")
        sys.exit(1)

    existing_names = {t.get("name", "") for t in existing}
    print(f"Found {len(existing)} existing transformations\n")

    for tmpl in TEMPLATES:
        if tmpl["name"] in existing_names:
            print(f"  SKIP {tmpl['name']} (already exists)")
            skipped += 1
            continue

        resp = requests.post(f"{API_URL}/api/transformations", json=tmpl, timeout=10)
        if resp.status_code in (200, 201):
            print(f"  ✓ Created {tmpl['name']}")
            created += 1
        else:
            print(f"  ✗ Failed {tmpl['name']}: {resp.status_code} {resp.text}")
            errors += 1

    print(f"\nDone: {created} created, {skipped} skipped, {errors} errors")


if __name__ == "__main__":
    seed()
