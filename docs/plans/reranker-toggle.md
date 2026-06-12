# Tracked Work Item: Reranker Toggle

**Status**: 📋 Planned — not yet implemented  
**Created**: 2026-06-12  
**Priority**: Medium

## Description

The search page (`/search`) uses a hybrid RRF reranker to improve result relevance. The toggle to enable/disable the reranker exists in the backend but is not yet wired into the UI.

## Scope

### Backend (complete)
- `api/routers/search.py` — accepts `use_reranker: bool` parameter
- Reranker logic in `open_notebook/search/hybrid_search.py`

### Frontend (TODO)
- Add **Reranker** toggle switch to the `/search` page UI
  - Location: search settings panel, alongside existing options
  - Default: on (matches current backend default)
  - Persists: store preference in `localStorage` or user settings

### Admin UI (TODO)
- Add **Test** button in Settings → Search to verify reranker is active
  - Fires a test search and shows whether reranker output differs from baseline

## Implementation Notes

- The reranker is Cohere-compatible — requires `COHERE_API_KEY` or equivalent in credentials
- When the key is absent, the backend silently falls back to pure RRF (no error)
- The UI should indicate when reranker is unavailable (key not configured)

## References

- `docs/status_12_JUN_2026/05-action-plan.md` — listed as Priority 3 action
- `docs/wiki/api-reference.md` — search endpoint contract
