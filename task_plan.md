# Task Plan: Voice & Podcast Enhancements and Next-Stage Roadmap

This task plan outlines the next logical 3 items (focused on Voice & Podcast Enhancements) followed by the next 10 items in portions of 3 (encompassing CRM Pipelines, Search/RAG, Social Media/Email Automation, and Workspace Document Generation). 

We strictly enforce **Karpathy Rules** (readable, complete code with no stubs/mock bypasses), accessibility audits, strict type-safety checks, and TDD-based automated testing.

---

## Goal
Establish a robust, fully-integrated roadmap and plan files, transitioning from Tenant & Organization Isolation to Voice, CRM, RAG, and Social Media/Email features.

## Current Phase
Phase 1: Planning & Setup

---

## 📋 The Roadmap & Checklist

### 🎙️ Phase 1: Voice & Podcast Enhancements (Next 3 Items)
- **Status:** in_progress

#### Item 1: TTS Engine Pre-Flight Checks & Backend Validation
- [x] Write failing pytest cases in `tests/test_voice_preflight.py` checking validation checks for TTS engines.
- [x] Implement pre-flight health checks and authentication checks for all configured TTS providers (Kokoro, OpenAI, ElevenLabs, Deepgram) in `api/routers/voice.py` under a new `/api/voice/preflight` endpoint.
- [x] Wire the pre-flight checks to the frontend Voice Settings page, ensuring that engines are validated before they can be selected.
- [x] Verify using the test suite.

#### Item 2: Autonomous Episode Writing & Scheduling Engine
- [x] Create failing pytest cases in `tests/test_episode_scheduler.py` verifying automated drafting and scheduling.
- [x] Build background worker tasks/endpoints inside `api/routers/podcasts.py` that crawl active notebook sources, notes, and frameworks, automatically compiling podcast outlines, drafting dialogue transcripts, and scheduling audio rendering.
- [x] Design the UI dashboard under `/podcasts` to show scheduled episodes, outlines, draft states, and manual trigger controls.
- [x] Validate database updates (new `scheduled_episode` schema in SurrealDB).

#### Item 3: Advanced Voice RAG Citations & Dialogue Memory
- [ ] Create failing pytest cases in `tests/test_voice_rag_citation.py` verifying dialogue memory and SSE citation events.
- [ ] Modify `api/routers/voice_rag.py` to maintain multi-turn short-term dialogue context memory during WebRTC voice sessions.
- [ ] Wire the LiveKit audio stream agent to emit a JSON SSE sub-event containing document citation source paths alongside synthesized response speech.
- [ ] Verify end-to-end voice session interactions.

---

### 📂 Phase 2: CRM & Sales Pipeline Multi-Views (Items 4-6)
- **Status:** pending

#### Item 4: Kanban Board and Calendar Multi-Views for Pipelines
- [ ] Expand the Kanban board component (`frontend/src/app/(dashboard)/pipeline`) to support alternative views: Table, List, and Calendar view of close dates.
- [ ] Ensure full accessibility, keyboard navigation, and aria labels for toggles.

#### Item 5: Team Member Assignment per Kanban Card
- [ ] Add `assigned_to` (user record) field mapping in SurrealDB pipeline schemas.
- [ ] Implement team member dropdown search and assignment selectors in the pipeline cards and inspector UI.

#### Item 6: Pipeline Linking to Customers & Projects
- [ ] Modify database relationships to link pipeline deals/cards directly to customer ledger records and notebook workspaces.
- [ ] Display quick links in the sidebar/cards to jump to corresponding client dossiers or notes.

---

### 🔍 Phase 3: Multi-Engine Search & RAG Enhancements (Items 7-9)
- **Status:** pending

#### Item 7: Native Reranker Model Support
- [ ] Update `ModelManager` to support cross-encoder rerankers, Cohere, or local Ollama reranking models directly.
- [ ] Write integration tests verifying score realignment.

#### Item 8: Reranker Configuration in Search Settings
- [ ] Expose reranker model selection, weight sliders, and testing triggers in the Admin configuration dashboard.
- [ ] Persist settings directly in the system configuration table.

#### Item 9: Multiple Pipeline Types (Sales, Research, Publication)
- [ ] Extend the pipeline schema to support different pipeline workflows: Sales Kanban, Research pipeline, and Publication queue.
- [ ] Expose a dropdown in the UI to switch between active pipeline types.

---

### ✉️ Phase 4: Social Media, Email & Docs Publication (Items 10-13)
- **Status:** pending

#### Item 10: SMTP & OAuth Integration for Gmail/Outlook
- [ ] Build backend configuration endpoints for SMTP settings and OAuth tokens.
- [ ] Support testing connection health and credentials validation directly in the UI.

#### Item 11: Content Calendar & Social Scheduler (LinkedIn, Twitter)
- [ ] Implement content calendar view displaying scheduled social media posts and email sequences.
- [ ] Create post scheduler drafting workflow with media upload support.

#### Item 12: Social Media Response & Reply Tracker
- [ ] Implement background cron tasks using skills to track replies, impressions, and engagement metrics for published content.
- [ ] Display metrics dashboards inside the content planner workspace.

#### Item 13: Styleguide-Driven Templates and Google Workspace Ingestion
- [ ] Build template engines matching user styleguides for PDF/DOCX compiler.
- [ ] Fully wire Google Slides/Sheets/Docs direct publishing connectors.

---

## 🧪 Verification Log
| Task | Method | Status | Details |
|------|--------|--------|---------|
| Item 1 | `pytest tests/test_voice_preflight.py` | [x] | Passed |
| Item 2 | `pytest tests/test_episode_scheduler.py` | [x] | Passed |
| Item 3 | `pytest tests/test_voice_rag_citation.py` | [ ] | Pending |
| E2E | `npx tsc --noEmit` & `npm run build` | [x] | Typechecks clean |

## ⚠️ Errors Encountered & Resolution
| Error | Attempt | Resolution |
|-------|---------|------------|
| None | - | - |
