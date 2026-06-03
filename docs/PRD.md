# Product Requirements Document — Tetrel Notebook

> **Version:** 2.0  
> **Last Updated:** 2026-06-02  
> **Status:** Approved (auto-approved via review policy)  
> **Owner:** Admin Team

---

## 1. Product Vision

Tetrel Notebook is an **AI-first integrated business operations platform** for small companies that need:

- **Knowledge management** — ingest, process, search, and leverage documents with AI
- **Voice-first interaction** — speak to your data, not just type
- **Sales pipeline management** — prospect → customer lifecycle with kanban
- **Content production** — social media, proposals, SOWs, publications
- **Research & intelligence** — autonomous agent-driven research with multiple search engines
- **Compliance assessment** — CSET-equivalent framework evaluation with quizzes and threat models
- **Publication pipeline** — magazine-quality export to PDF, PPTX, DOCX, Google Workspace, social media
- **Full observability** — admin pages for all APIs, Docker containers, skills, MCPs, agent workflows

## 2. Non-Negotiable Principles

| # | Principle | Description |
|---|---|---|
| P1 | **Karpathy Rules** | Simple, readable code. No over-engineering. Use existing solutions. |
| P2 | **Skills-First** | Use installed skills, MCPs, libraries, GitHub projects. NO custom code where existing solutions exist. |
| P3 | **TDD** | No production code without a failing test first. |
| P4 | **No Faking** | No stubs, fillers, placeholders, or mock data in production paths. |
| P5 | **Full Observability** | ALL variables, configs, prompts, models, providers adjustable in admin UI with immediate effect. |
| P6 | **Full Traceability** | Track all changes, audit all activities, version all documents. |
| P7 | **No Drift** | Always reference plans, specs, PRD. Update docs with every change. |
| P8 | **Docker Portable** | Everything runs in containers. Fully portable deployment. |

## 3. User Personas

### Admin Team (5 users)
- Full access to all features
- Manage customers, pipelines, research
- Configure AI models, skills, workflows
- View all customer data and audit logs
- Create and publish content

### Customer Users (N customers, each with their own org)
- Access only their own data
- Upload documents (ingested to markdown)
- Access compliance education (all frameworks)
- Take compliance quizzes, view analytics/reporting
- View generated reports, SOWs, supporting documents
- Cannot see other customer folders

## 4. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) | TypeScript, i18n (12 languages incl. Dutch) |
| **Backend** | FastAPI | Python, 38 routers, async |
| **Database** | SurrealDB v2 | Graph relationships, vector search |
| **Voice** | Kokoro TTS, Faster Whisper STT, LiveKit SFU | Docker services, NO ElevenLabs |
| **Search** | Vector (SurrealDB) + Valyu + Perplexity | Hybrid multi-engine with reranker |
| **AI Models** | OpenRouter, Ollama, LMStudio, OpenAI, Anthropic, Google | Configurable per task |
| **Containerization** | Docker Compose | 6+ services |

## 5. Feature Requirements

### 5.1 Knowledge Management (CURRENT ✅)
- Notebook CRUD with canvas, notes, sources, AI chat
- Source ingestion via Docling (PDF, DOCX, URLs, text)
- Markdown storage with provenance
- Vector search + text search
- Scheduled recurring searches
- Transformations (AI-driven insight extraction)

### 5.2 Voice & Podcast (CURRENT ✅ — NEEDS ENHANCEMENT)
- 4 TTS engines: Kokoro, OpenAI, Google, Azure (NO ElevenLabs)
- 3 STT engines: Faster Whisper, Deepgram, Google
- LiveKit WebRTC for real-time voice
- Voice RAG pipeline (STT → search → LLM → TTS)
- Podcast generation with episode/speaker profiles
- **NEEDED:** Backend TTS engine assignment before voice selection
- **NEEDED:** AI-driven autonomous episode writing/scheduling

### 5.3 Search & RAG (CURRENT ✅ — NEEDS RERANKER)
- Vector search with embedding models
- Hybrid search (Local + Valyu + Perplexity)
- Ask pipeline (LangGraph strategy → answer → final)
- Research engine (local, perplexity, hybrid)
- LLM-based reranker (exists)
- **NEEDED:** Native reranker model support (cross-encoder, Cohere, Ollama)
- **NEEDED:** Reranker configurable in admin search settings
- **NEEDED:** Voice RAG with citations and multi-turn memory

### 5.4 Pipeline & CRM (CURRENT ✅ — NEEDS ENHANCEMENT)
- Pipeline kanban with rules and stage automation
- Customer CRUD with detail pages
- Contact CRUD linked to customers
- CSV/XLSX import/export
- **NEEDED:** Multiple views (board, table, list, calendar)
- **NEEDED:** Team member assignment per card
- **NEEDED:** Link to customers and projects
- **NEEDED:** Multiple pipeline types (Sales, Research, Publication)

### 5.5 Compliance (CURRENT ✅ — NEEDS CSET FULL PORT)
- 50+ CSET compliance framework blueprints
- Assessment creation and management
- **NEEDED:** ALL CSET data — complete, untruncated, with all citations
- **NEEDED:** ALL assessment wizards per framework
- **NEEDED:** ALL examination quizzes with scoring
- **NEEDED:** Full threat model canvas (library, equipment, diagrams)
- **NEEDED:** Asset management
- **NEEDED:** Reporting and analytics per customer
- **NEEDED:** Per-customer assignment linked to customer ledger

### 5.6 Autonomous Agent Framework (NEW — FOUNDATIONAL)
- Reusable agent execution engine
- Agent config: name, trigger, schedule, steps, models, prompts
- Full observability: execution logs, input/output, duration
- ALL configs adjustable in admin UI
- Used by: social media, research, sales, document generation, compliance

### 5.7 Social Media & Email (NEW)
- Via skills: LinkedIn, Twitter/X, Gmail, Outlook/O365
- SMTP and OAuth configurable by admin (default: Gmail)
- Post scheduling, statistics collection, reply tracking
- Content calendar view
- All configurable, testable, observable in admin

### 5.8 Document Export (NEW)
- Via skills: PDF, PPTX, DOCX, Google Slides/Sheets/Docs
- Styleguide-driven templates (customer-linked)
- Magazine-quality social media images
- Priority order: LinkedIn, Gmail, Google Slides/Sheets/Docs, then PPTX/PDF

### 5.9 Research Pipeline (NEW)
- General research (not customer-tied): market, sector, news, deep dives
- Sales research: TAM/SAM, competitor, prospect, meeting prep
- Publication kanban: Concept → Refinement → Publication Type → Review → Publish → Track
- All stored in vector, accessible by admins

### 5.10 Customer Organizations & Auth (NEW)
- Admin org (5 users) with full access
- Customer orgs with isolated file storage
- Per-customer compliance access
- Full audit logging of all file/user activities
- Admin review of all customer interactions

### 5.11 Admin Observability (NEW — BUILT INCREMENTALLY)
- Docker services: health, logs, restart
- API keys & providers: status, test, usage
- Skills registry: all installed, enable/disable, config vars
- MCP servers: tools, connection status
- Agent workflows: schedules, execution history
- Search engine: vector, reranker, Valyu, Perplexity config
- Audit log: all user/customer activities
- Rebuild/maintenance: embeddings, cache, indexes

## 6. Languages

Primary: English (en-US), Dutch (nl-NL)
Supported: zh-CN, zh-TW, pt-BR, ja-JP, it-IT, fr-FR, ru-RU, bn-IN, es-ES, de-DE

Dutch must be **native** — AI agent audits entire UI for English-only content.

## 7. Deployment

- Docker Compose with 6+ services
- Fully portable
- No cloud vendor lock-in
- Development mode (no production auth hardening yet)
