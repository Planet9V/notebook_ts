# Task Plan: Aalberts Workspace Enhancements

## Goal
Implement the high-value usability recommendations for the Aalberts N.V. visual workspace:
1. **Fix Note Content Truncation**: Return complete note content on list endpoints so sidebar card previews populate and editors open immediately.
2. **Split-Pane Workspace Layout**: Render the Notes Column on the left and the Relations Graph on the right when relations are active (instead of toggling full screen).
3. **AI Natural Language Relationship Reasons**: Fetch natural language explanations from the local LLM when suggesting notes/sources links, with a clean technical fallback.

---

## Phases

### Phase 1: Fix Note Content Truncation [Priority: High]
- **Task**: Pass `include_content=True` when retrieving notes by `notebook_id` in the `GET /notes` endpoint of `api/routers/notes.py`.
- **File**: [notes.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notes.py)
- **Verification**: Run backend pytest (`tests/test_notes_api.py`) to confirm no regressions. Check API output with a curl command or python request.

### Phase 2: Split-Pane Sidebar Layout [Priority: High]
- **Task**: Update the desktop layout in the notebook page component. When `showRelations` is true, render the collapsible `NotesColumn` on the left and `RelationsGraph` on the right.
- **File**: [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/notebooks/[id]/page.tsx)
- **Verification**: Run frontend compilation (`npm --prefix frontend run build`) to ensure zero TypeScript errors.

### Phase 3: AI Natural Language Relationship Reasons [Priority: High]
- **Task**: Modify `api/routers/notes.py`'s `get_suggested_links` function. When a match is found based on term overlap, run an asynchronous LLM request to synthesize a one-sentence explanation of how they are related. Use `asyncio.gather` for parallel processing and add a fallback to "Shared terms: ..." if the LLM call fails.
- **File**: [notes.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notes.py)
- **Verification**: Run `verify_aalberts.py` and print the returned reasons to verify the LLM synthesized text.

### Phase 4: UI Browser Evaluation [Priority: Medium]
- **Task**: Trigger the browser subagent to navigate to the Aalberts NA notebook, toggle relations, verify the split-pane sidebar, view the AI relationship card showing natural language explanations, click Accept, and capture screenshots.
- **Verification**: Ensure no untracked files are left.

---

## Decision Log
- **2026-06-17**: Decided to run the LLM relationship reasoning calls in parallel using `asyncio.gather` to keep API response times under 1 second.
- **2026-06-17**: Decided against adding custom coordinate saving to the database to avoid writing complex migrations and maintain Karpathy P1 simplicity.
