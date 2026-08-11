"""
OXOT Deep Research Seeding Script for Cyber Resilience Act (CRA) & OT Security Memory.
Seeds comprehensive B2B research records into Postgres + pgvector research_corpus.
"""

import asyncio
import os
import sys

# Ensure repository root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from open_notebook.search.research_memory import ResearchMemory
from loguru import logger

OXOT_RESEARCH_ENTRIES = [
    {
        "query": "Cyber Resilience Act Regulation EU 2024/2847 CE mark conformity retainer",
        "title": "CRA Regulation (EU) 2024/2847: Full Conformity & Retainer Requirements",
        "url": "https://oxot.nl/the-cra/retainer",
        "content": (
            "Regulation (EU) 2024/2847 (The Cyber Resilience Act) requires hardware and software products "
            "with digital elements to maintain CE mark conformity throughout their market lifecycle. "
            "OXOT's CRA Readiness Retainer (€25K-€50K per year, per client) provides standing access to "
            "senior OT security engineers and reserved capacity across the bench network. "
            "Obligations include 24/7 vulnerability handling, continuous SBOM currency monitoring, "
            "substantial-modification assessments on every release, 10-year technical file retention, "
            "and 5-year certificate validity with surveillance audits."
        ),
        "source_type": "regulatory_standard",
        "relevance_score": 0.98,
        "organization_id": "OXOT-B2B",
        "service_category": "CRA Conformity",
    },
    {
        "query": "IEC 62443 Industrial Control System Security Audit and Facility Due Diligence",
        "title": "IEC 62443 Standard & OT Industrial Facility Cybersecurity Auditing",
        "url": "https://oxot.nl/consulting/iec-62443",
        "content": (
            "IEC 62443 is the international benchmark for Industrial Automation and Control Systems (IACS) security. "
            "OXOT delivers facility due diligence, zone and conduit segmentation, threat modeling, and OT network architecture reviews. "
            "Our Cyber Digital Twin platform allows industrial operators to emulate OT PLC controllers, SCADA nodes, "
            "and industrial protocols (Modbus, PROFINET, OPC UA) to test attack resilience without risking live factory downtime."
        ),
        "source_type": "technical_standard",
        "relevance_score": 0.95,
        "organization_id": "OXOT-B2B",
        "service_category": "OT Consulting",
    },
    {
        "query": "OXOT Cyber Digital Twin OT vulnerability emulation platform",
        "title": "Cyber Digital Twin: Hardware-in-the-Loop Vulnerability Emulation",
        "url": "https://oxot.nl/cyber-digital-twin",
        "content": (
            "The OXOT Cyber Digital Twin creates virtual replicas of complex OT industrial environments. "
            "It enables real-time vulnerability testing, zero-day threat analysis, and automated firmware patch verification. "
            "Integrators and manufacturers use the Cyber Digital Twin to fulfill CRA Article 10 vulnerability handling rules "
            "and satisfy NIS2 critical infrastructure requirements."
        ),
        "source_type": "product_architecture",
        "relevance_score": 0.96,
        "organization_id": "OXOT-B2B",
        "service_category": "Digital Twin",
    },
]

async def seed_oxot_research():
    logger.info("Starting OXOT Deep Research memory seeding...")
    try:
        pool = await ResearchMemory.get_pool()
        for entry in OXOT_RESEARCH_ENTRIES:
            # Simple synthetic 1536-dim embedding vector
            synthetic_vector = [0.01 * (i % 10) for i in range(1536)]
            await ResearchMemory.store_result(
                query=entry["query"],
                result={
                    "title": entry["title"],
                    "url": entry["url"],
                    "content": entry["content"],
                    "source_type": entry["source_type"],
                    "relevance_score": entry["relevance_score"],
                },
                embedding=synthetic_vector,
            )
            logger.info(f"Seeded: {entry['title']}")
        logger.info("OXOT Deep Research memory seeding complete!")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")

if __name__ == "__main__":
    asyncio.run(seed_oxot_research())
