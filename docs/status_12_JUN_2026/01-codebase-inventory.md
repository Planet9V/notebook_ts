# Codebase Inventory — June 12, 2026

> Complete itemization of all documentation locations, source code structure, and key file counts.

---

## 1. Documentation Locations (All Markdown)

### A. Primary Docs Hub: `/docs/`

| Location | Contents | Last Modified | Status |
|---|---|---|---|
| `docs/0-START-HERE/` | Quick start guides (cloud, local, OpenAI) | May 21, 2026 | 🟡 Stale |
| `docs/1-INSTALLATION/` | Installation guides | May 21, 2026 | 🟡 Stale |
| `docs/2-CORE-CONCEPTS/` | Core concepts | May 21, 2026 | 🟡 Stale |
| `docs/3-USER-GUIDE/` | User guides | May 21, 2026 | 🟡 Stale |
| `docs/4-AI-PROVIDERS/` | AI provider guides | May 21, 2026 | 🟡 Stale |
| `docs/5-CONFIGURATION/` | Configuration guides | Jun 8, 2026 | 🟡 Partially Current |
| `docs/6-TROUBLESHOOTING/` | Troubleshooting | May 21, 2026 | 🟡 Stale |
| `docs/7-DEVELOPMENT/` | Development docs (arch, code standards, API ref) | Jun 2, 2026 | 🟡 Partially Current |
| `docs/wiki/` | 16 wiki pages (agent, arch, compliance, voice, etc.) | Jun 9, 2026 | 🟡 Partially Current |
| `docs/blueprints/` | 68 blueprint files | May 23, 2026 | 🔴 Archival/stale |
| `docs/plans/` | 14 implementation plan files | Jun 11, 2026 | 🟡 Mixed |
| `docs/notebook-features-rev-3/` | Rev 3 spec and Loom mockup | Jun 9, 2026 | 🟡 Archival |
| `docs/valyu-cookbook/` | 21 Valyu integration files | Jun 8, 2026 | ✅ Domain-specific |
| `docs/status-june-8-2026/` | June 8 status snapshot (11 files) | Jun 8, 2026 | 🔴 Superseded |
| `docs/status_12_JUN_2026/` | **This report** | Jun 12, 2026 | ✅ Current |

### B. Root-Level Docs in `/docs/` (Loose Files)

| File | Description | Last Modified | Status |
|---|---|---|---|
| `docs/8-PAGES.md` | Site tree + page inventory | Jun 11, 2026 | ✅ Current |
| `docs/API_CONTRACTS.md` | API shape contracts | Jun 2, 2026 | 🟡 Partially Current |
| `docs/DECISIONS.md` | Architecture decisions | Jun 2, 2026 | 🟡 Partially Current |
| `docs/PRD.md` | Product requirements | Jun 2, 2026 | 🟡 Partially Current |
| `docs/SPECIFICATIONS.md` | Technical specifications | Jun 2, 2026 | 🟡 Partially Current |
| `docs/SKILLS_INVENTORY.md` | Skills inventory | Jun 2, 2026 | 🟡 Partially Current |
| `docs/SECURITY_REVIEW.md` | Security review notes | May 21, 2026 | 🔴 Stale |
| `docs/architecture.md` | High-level architecture (root) | May 22, 2026 | 🔴 Stale/duplicate |
| `docs/development-rules.md` | Karpathy P1-P8 rules | Jun 8, 2026 | ✅ Current |
| `docs/implementation_plan.md` | Old implementation plan | Jun 2, 2026 | 🔴 Archival |
| `docs/index.md` | Doc hub index | May 21, 2026 | 🟡 Stale |
| `docs/operations_runbook.md` | Operations runbook | May 22, 2026 | 🟡 Stale |
| `docs/task.md` | Task tracker (active session) | Jun 11, 2026 | 🟡 Mixed |
| `docs/taskmaster.md` | Taskmaster tool guide | Jun 2, 2026 | 🟡 Partially Current |
| `docs/walkthrough.md` | Latest walkthrough (large) | Jun 11, 2026 | ✅ Recent |

### C. Root-Level Docs (Project Root)

| File | Description | Status |
|---|---|---|
| `GEMINI.md` | AI agent instructions (primary) | ✅ Active |
| `CLAUDE.md` | Mirrors GEMINI.md | ✅ Active |
| `README.md` | Main project README | 🟡 Not reviewed |
| `progress.md` | 7 Perspectives wiring log | 🔴 In-progress items never closed |
| `task_plan.md` | 7 Perspectives task plan | 🔴 Incomplete items, never archived |
| `taskmaster_report.md` | Taskmaster report | 🔴 Archival |
| `findings_brainstorm.md` | Research-to-Creation brainstorm | 🟡 Reference |
| `option_a_entity_notes.md` | Entity notes | 🔴 Archival |
| `TEST_INFRA.md` | Loom mockup test infra | 🟡 Reference |
| `TEST_READY.md` | Test suite readiness | 🟡 Reference |

### D. In-Code Documentation (CLAUDE.md files)

| Location | Purpose |
|---|---|
| `open_notebook/CLAUDE.md` | Top-level domain docs |
| `open_notebook/ai/CLAUDE.md` | AI subsystem |
| `open_notebook/database/CLAUDE.md` | Database layer |
| `open_notebook/domain/CLAUDE.md` | Domain models |
| `open_notebook/graphs/CLAUDE.md` | LangGraph chains |
| `open_notebook/podcasts/CLAUDE.md` | Podcast subsystem |
| `open_notebook/utils/CLAUDE.md` | Utilities |
| `prompts/CLAUDE.md` | Prompt engineering |
| `api/` (no CLAUDE.md) | **Missing** — 49-router API has no in-code docs |

---

## 2. Source Code Structure

### Backend Python (`/open_notebook/`)

| Folder | Purpose | Files |
|---|---|---|
| `open_notebook/ai/` | Model discovery, provider registry, Esperanto integration | ~12 files |
| `open_notebook/database/` | SurrealDB async client, migration runner | ~10 files |
| `open_notebook/domain/` | Domain models (Pydantic, RecordModel subclasses) | ~20 files |
| `open_notebook/graphs/` | LangGraph chains (research, chat, transformations) | ~8 files |
| `open_notebook/podcasts/` | Podcast models and migration | 4 files |
| `open_notebook/search/` | Hybrid RRF search implementation | ~5 files |
| `open_notebook/tasks/` | Background task workers | ~8 files |
| `open_notebook/utils/` | Utilities (text, file handling) | ~6 files |

### API Layer (`/api/`)

| Item | Count/Detail |
|---|---|
| Routers | **47 registered** in `api/main.py` (49 files including `__init__.py`) |
| Router categories | CRM, Research, AI/ML, Voice, Podcasts, Content, System |
| Migrations | **49 `.surrealql` files** (migrations 1–49 up + down) |
| Background workers | 4 workers in `api/main.py` lifespan |

### Frontend (`/frontend/`)

| Item | Count/Detail |
|---|---|
| Total `page.tsx` files | **35 pages** |
| Route groups | `(auth)` — 1 page; `(dashboard)` — 34 pages |
| Settings pages | 7 (`/settings`, `/settings/api-keys`, `/settings/containers`, `/settings/logs`, `/settings/pipeline`, `/settings/publications`, `/settings/styleguides`, `/settings/voice`) |
| Framework | Next.js `^16.2.6`, React `^19.2.3` |

### Tests (`/tests/`)

| Item | Count |
|---|---|
| Total test files | **68** |
| Tests passing | **436** |
| Tests failing | **53** |
| Test files with collection errors | **3** (Playwright import issues) |

---

## 3. Docker Services (6 containers)

| Service | Port | Status |
|---|---|---|
| `surrealdb` | 8000 | ✅ Running |
| `postgres` | 5433 | ✅ Running |
| `open_notebook` | 8502, 5055 | ✅ Running |
| `livekit-server` | 7880, 7881 | ✅ Running |
| `kokoro-tts` | 8880 | ✅ Running |
| `whisper-stt` | 8881 | ✅ Running |

---

## 4. Git State

| Item | Detail |
|---|---|
| Current branch | `main` |
| Remote origin | `https://github.com/Planet9V/notebook_ts.git` |
| Remote upstream | `https://github.com/lfnovo/open-notebook.git` |
| Commits ahead of upstream | **67 commits** |
| Uncommitted modified files | **5** (voice routers + frontend) |
| Untracked files | `CLAUDE.md.pre-ruflo`, `TEST_INFRA.md`, `TEST_READY.md`, `findings_brainstorm.md`, `package-lock.json`, `package.json` |
| Open GitHub issues (Planet9V) | **2** (Dependabot dependency bumps) |
| Open upstream issues (lfnovo) | 10+ (bugs, features — not directly applicable) |
