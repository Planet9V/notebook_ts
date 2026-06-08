# Application Sitemap & Route Tree

*Last Updated: June 8, 2026*

---

The Next.js App Router defines a clear navigation hierarchy, segmented into core workspace consoles, system configuration dashboards, and administrative settings.

## 1. Route Navigation Tree

```
/ (Root Redirect)
├── /notebooks                       # Proposal drafting workspace, notes, & canvas
├── /search                          # Multi-engine search console (Valyu, Brave, Local)
├── /research                        # Autonomous DeepResearch dashboards
├── /research-memory                 # pgvector semantic cache statistics & explorer
├── /compliance                      # CSET-equivalent quiz & facility threat models
├── /customer-ledger                 # billing details, PII, and customer folders
├── /pipeline                        # Drag-and-drop B2B Kanban pipeline board
├── /contacts                        # Contact directory
├── /operations                      # Server operations console (Docker, MCP logs)
├── /podcasts                        # Automated podcast generation console
├── /documentation                   # Live developer & user API wiki page
├── /voice-playground                # Real-time WebRTC Voice AI testing lab
└── /settings                        # System configuration settings panel
    ├── /settings/logs               # System diagnostics logger (SurrealDB loguru)
    ├── /settings/voice              # Voice TTS/STT provider mappings
    ├── /settings/publications       # Social media SMTP/OAuth configs
    └── /settings/containers         # Container health dashboards
```

---

## 2. Directory Descriptions

### Workspace consoles
*   **`/notebooks`:** The central knowledge canvas. Allows users to upload source files (ingested via Docling), write inline notes, drag drawn asset blocks on a React Flow canvas, and export final documents to Google Docs, Slides, and Sheets.
*   **`/search`:** Multi-engine router combining Brave API (web), PostgreSQL (local vector cache), and Valyu API (news/legal/academic). Highlights search query terms and parses meta descriptions dynamically.
*   **`/research`:** Command console for spawning autonomous DeepResearch background runs. Displays active runs, depth settings (Fast, Standard, Heavy, Max), and polling histories.
*   **`/research-memory`:** Observability tool for pgvector cache database. Renders documents count, table size, oldest/newest entries, and cache hit metrics.
*   **`/compliance`:** Interactive CSET dashboard. Features framework checklists, scoring dials, facility threat vectors, and compliance certificates.
*   **`/pipeline`:** Drag-and-drop Kanban board for tracking client stages (Prospect, Lead, Proposal, Negotiating, Won). Uses glowing border visual markers to reflect deal status and card health.

### Administration & Settings
*   **`/settings/logs`:** Diagnostic console utilizing a glassmorphic layout. Allows administrators to search, filter (Info, Warning, Error), and view system logs written to SurrealDB.
*   **`/settings/voice`:** Configurations for text-to-speech (TTS) and speech-to-text (STT) models. Allows changing voice defaults (e.g. Kokoro, OpenAI, Google) and testing microphones.
*   **`/settings/publications`:** Setup for social media triggers (LinkedIn, Twitter/X) and email notification systems.
*   **`/settings/containers`:** Live Docker container status monitors, displaying CPU, memory, and restart triggers.
