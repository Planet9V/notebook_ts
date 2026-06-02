# Master Task Plan — Phase 4: Reranking, Historical Snapshots, and SOW Copilot

This file tracks the active checklist and progress for Phase 4. We enforce TDD and Karpathy rules (clean, complete code with no stubs).

---

## 📋 The Master Checklist

- [x] **Task A: Reranker UI Toggle & Slider Controls**
  - [x] Initialize `searchConfigs` state in `page.tsx` with limit, minimumScore, and reranker properties for vector and hybrid search types.
  - [x] Add `localStorage` mounting and saving side-effects.
  - [x] Expose an expandable "Search Config" configuration panel in the UI with sliders and a reranker checkbox.
  - [x] Connect configuration to the search query mutation.
  - [x] Run `npx tsc --noEmit` to verify type safety.
  - [x] Commit Task A.

- [x] **Task B: Reranker Admin Sandbox Comparison Tool**
  - [x] Create failing test `tests/test_search_compare.py`.
  - [x] Run test to verify failure.
  - [x] Implement `POST /api/search/compare` in `api/routers/search.py` calculating latency and relevance scores side-by-side.
  - [x] Build comparison Sandbox component `RerankerSandbox.tsx` in `frontend`.
  - [x] Embed the sandbox in `/advanced/page.tsx`.
  - [x] Run test to verify pass.
  - [x] Commit Task B.

- [x] **Task C: CSET Historical Audit Logging**
  - [x] Create failing test `tests/test_cset_snapshot.py`.
  - [x] Run test to verify failure.
  - [x] Add `compliance_snapshot` field to `AssessmentSessionResponse` in `api/models.py`.
  - [x] Calculate score/coverage on session completion and save to SurrealDB session record in `api/routers/assessments.py`.
  - [x] Run test to verify pass.
  - [x] Commit Task C.

- [x] **Task D: Inline SOW Drafting Autocomplete**
  - [x] Create failing test `tests/test_draft_copilot.py`.
  - [x] Run test to verify failure.
  - [x] Implement `POST /api/agents/draft/copilot` in `api/routers/agents.py` using Drafting Copilot prompts and chat models.
  - [x] Implement UI Copilot toolbar above `MarkdownEditor` in `B2BDraftingWorkspace.tsx`.
  - [x] Hook text selection to populate suggestion inputs, and show Accept & Replace actions.
  - [x] Run tests and verify frontend compilation.
  - [x] Commit Task D.

---

## 🧪 Verification Log

| Task | Method | Status | Details |
|------|--------|--------|---------|
| Task A | `npx tsc --noEmit` | [x] | Success |
| Task B | `pytest tests/test_search_compare.py` | [x] | Success, passed 100% |
| Task C | `pytest tests/test_cset_snapshot.py` | [x] | Success, passed 100% |
| Task D | `pytest tests/test_draft_copilot.py` | [x] | Success, passed 100% |

---

## ⚠️ Errors Encountered & Resolution

| Error | Attempt | Resolution |
|-------|---------|------------|
| TS size="xs" on Button | 1 | Replaced with size="sm" (standard prop size) |
| Loader2 missing | 1 | Added Loader2 to lucide-react imports in B2BDraftingWorkspace |
| Slider id prop | 1 | Removed id prop from Slider in RerankerSandbox |

