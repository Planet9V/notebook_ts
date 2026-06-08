# Product Marketing Context

*Last Updated: June 8, 2026*

---

## 1. Product Overview

*   **One-liner:** The secure, self-hosted, AI-first operations and knowledge OS for compliance-sensitive enterprises.
*   **What it does:** Tetrel Notebook consolidates document ingestion, semantic search caching, autonomous research workers, CRM pipeline tracking, CSET compliance quizzing, and WebRTC voice audio chat into a single, portable, containerized ecosystem.
*   **Product Category:** Enterprise Knowledge OS / AI-First Business Operations Platform.
*   **Product Type:** B2B SaaS / Self-Hosted Enterprise Software.
*   **Business Model:** Enterprise Software Licensing & Self-Hosted Support Contracts.

---

## 2. Target Audience & Ideal Customer Profile (ICP)

*   **Target Companies:** Mid-market organizations, government contractors, chemical refineries, aerospace developers, and security laboratories (e.g. CISA CFATS, TSA Rail regulated facilities) that handle highly confidential or proprietary corporate intelligence.
*   **Decision-Makers:** Chief Information Officers (CIOs), Chief Information Security Officers (CISOs), Directors of Operations, and Compliance Directors.
*   **Primary Use Case:** Securing internal documentation, running deep sector research with full privacy, and guiding facility operators through regulatory compliance frameworks.

---

## 3. Key Personas (B2B)

| Persona | Cares About | Core Challenge | Value Promise |
| :--- | :--- | :--- | :--- |
| **CISO / CISO Officer** | Zero data leakage, strict access controls, complete self-hosted logs, regulatory compliance. | Employees copying sensitive corporate IP into public ChatGPT windows. | 100% self-hosted Docker portable container suite; no cloud data leaks. |
| **Director of Operations** | Hands-free field operations, procedural speed, audit preparedness. | Technicians struggling to retrieve manuals or records in high-protection zones. | Real-time WebRTC Voice RAG pipeline with under 300ms audio latency. |
| **Research Lead / Analyst** | Multi-source depth, citation authenticity, publication pipelines. | Wasting hours manually aggregating PDFs, news, and academic papers into reports. | Autonomous DeepResearch agent polling Valyu/Brave with a pgvector deduplicating cache. |

---

## 4. Problems & Pain Points

*   **Corporate Data Leakage:** Employees upload proprietary code, patents, and financial plans to cloud LLMs, resulting in security compliance breaches.
*   **Information Fragmentation:** Critical data is scattered across Slack, local files, CRM cards, notes, and external search engines, leading to search fatigue.
*   **Audit Overhead:** Compliance audits (e.g., CSET, CFATS) require expensive, multi-week consultant visits and chaotic spreadsheets.
*   **API Cost Inflation:** Repeating semantic searches or LLM operations on identical documents results in high monthly API bills.

---

## 5. Competitive Landscape

*   **Direct Competitors (Public Cloud AI Tools):** ChatGPT Team/Enterprise, Microsoft Copilot Studio.
    *   *Where they fall short:* Data is stored in public clouds; licensing costs scale aggressively; offline or local air-gapped deployments are impossible.
*   **Secondary Competitors (Isolated Knowledge Bases):** Notion, Confluence.
    *   *Where they fall short:* Standard wiki structures; lack native voice integration, automated research agents, and custom CSET compliance scoring.
*   **Indirect Competitors (Manual Pipelines):** Email, spreadsheets, external auditing consultants.
    *   *Where they fall short:* Slow, error-prone, insecure, and extremely expensive over time.

---

## 6. Key Differentiation

1.  **Air-Gapped Deployment:** The entire system runs inside Docker containers on host networks. You can run Tetrel Notebook offline without external data access if local LLM providers (e.g., Ollama, LMStudio) are configured.
2.  **Hybrid pgvector Search Caching:** Implements a local PostgreSQL semantic cache. Repeat searches on identical concepts return in under 5ms, bypassing external API calls and saving API costs.
3.  **Real-Time voice WebRTC RAG:** Connects LiveKit SFU directly with Faster Whisper STT and Kokoro TTS inside the Docker cluster, bypassing laggy third-party webhooks.
4.  **Graph-Document Modeling:** Combines SurrealDB v2 (graph connections for pipeline cards, notes, and customer records) and PostgreSQL (for vector embeddings).

---

## 7. Switching Dynamics (The Four Forces)

```
                       PULL (Attraction to Tetrel)
                       - Zero data-leak worries
                       - real-time WebRTC voice
                       - pgvector search cache
                       ┌────────────────────────►
         PUSH (Frustrations)             ANXIETY (Switching worries)
         - Insecure public AI            - Deploying Docker containers
         - Fragmented doc silos          - Migrating legacy files
         - Sky-high API fees             - Local audio latency
                       ┌────────────────────────►
                       HABIT (Stuck in old ways)
                       - Spreadsheet trackers
                       - Manual paper audits
                       - Basic folders
```

*   **Push:** Insecurity of public AI tools, rising document fragmentations, high subscription bills.
*   **Pull:** Out-of-the-box local compliance quiz, sub-300ms WebRTC voice chat, pgvector deduplication.
*   **Habit:** Teams are comfortable using basic spreadsheets, folders, and manual word processors.
*   **Anxiety:** High initial deployment hurdle, migrating legacy documents, setting up SSL certificates.

---

## 8. Customer Language & Brand Voice

### Customer Verbatim
*   *"We want our operators to ask for security protocols hands-free while walking the refinery floor."*
*   *"I cannot allow our engineers to paste proprietary schematics into ChatGPT."*
*   *"We need our research reports to automatically pull from PubMed and ArXiv and cite their sources."*

### Brand Voice
*   **Tone:** Objective, technical, secure, and professional.
*   **Words to Use:** Self-hosted, air-gapped, containerized, pgvector, SurrealDB graph, CSET framework, data ownership, RRF ranking.
*   **Words to Avoid:** Magic, disruption, paradigm shift, revolutionary (keep descriptions grounded in technical facts and concrete numbers).
