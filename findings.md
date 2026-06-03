# Research Findings — Phase 4: Reranking Sandbox, CSET Snapshots, SOW Copilot

**Date:** 2026-06-02  
**Goal:** Implement Search Tuning, Raw vs Reranked Sandbox, Completed Session snapshots, and Drafting Copilot in SOW editor.

---

## 🔍 Existing Infrastructure Research

### A. Search & Reranking (`api/routers/search.py`)
- We analyzed the search pipeline and confirmed the endpoint is `POST /api/search` using the `SearchRequest` schema.
- The `reranker` field is already part of the `SearchRequest` Pydantic model.
- The backend performs LLM-based reranking if `search_request.reranker` is true, querying the default "reranker" model (configured via `model_manager.get_default_model("reranker")`).
- The frontend page `frontend/src/app/(dashboard)/search/page.tsx` hardcodes `limit: 100` and `minimum_score: 0.2` in `handleSearch` and binds a simple toggle for `rerankerEnabled`.

### B. Session Completion (`api/routers/assessments.py`)
- The completion endpoint is `POST /api/sessions/{session_id}/complete` which marks session status to "COMPLETED" and updates `completed_at`.
- The session table `assessment_session` is schemaless (`DEFINE TABLE IF NOT EXISTS assessment_session SCHEMALESS` in migration 16).
- Scoring calculations are done in `GET /api/sessions/{session_id}/report`, utilizing SurrealQL queries to load standard questions and answers:
  - Yes + ALT answers are counted.
  - Unanswered questions are treated as NO for security posture calculations.
  - Compliance score and category-specific stats are dynamically calculated.

### C. Drafting Copilot (`B2BDraftingWorkspace.tsx` and `api/routers/agents.py`)
- `B2BDraftingWorkspace.tsx` has a registered "Drafting Copilot" agent configuration with default prompt: `"You are a professional B2B compliance drafter specializing in high-fidelity technical contracts. Help the user expand the compliance targets into robust, non-ambiguous milestones and deliverables."`
- Prompts can be customized per notebook in the `agent_prompt` table.
- The workspace integrates a dynamic SOW editor utilizing `MarkdownEditor` which wraps `@uiw/react-md-editor`.
