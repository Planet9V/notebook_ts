# Reranker Sandbox, Historical Audit, and SOW Copilot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate granular search config controls in the search page, build a comparison sandbox in the Admin advanced panel for raw vs reranked search, capture compliance metrics snapshots upon session completion, and implement an inline AI SOW drafting assistant.

**Architecture:** 
1. The search settings will bind local state configurations per search type and persist them to localStorage.
2. A comparison endpoint `POST /api/search/compare` will run raw and reranked pipelines to calculate deltas.
3. The session complete route will run audit metrics calculation on-the-fly and persist the output snapshot to the SurrealDB session record.
4. SOW Drafting Copilot triggers an inline suggestion panel in the Markdown editor using cursor selections and a new FastAPI prompt helper.

**Tech Stack:** FastAPI, LangChain, SurrealDB, React/Next.js, Tailwind CSS, Lucide icons, `@uiw/react-md-editor`.

---

### Task A: Reranker UI Toggle & Slider Controls

**Files:**
- Modify: [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/search/page.tsx)

**Step 1: Define Config State & local storage binding**
In `page.tsx`, import `Slider` from `@/components/ui/slider`. Define the default structure for search configurations:
```tsx
const [searchConfigs, setSearchConfigs] = useState({
  vector: { limit: 50, minimumScore: 0.2, reranker: false },
  hybrid: { limit: 50, minimumScore: 0.2, reranker: false },
})
const [showConfig, setShowConfig] = useState(false)
```
Add a `useEffect` to load `search_configs` on mount, and save it on modifications.

**Step 2: Update API Request payload**
In `handleSearch`, replace the hardcoded values with values from `searchConfigs[searchType]`:
```tsx
const currentConfig = searchConfigs[searchType]
searchMutation.mutate({
  query: searchQuery,
  type: searchType,
  limit: currentConfig.limit,
  search_sources: searchSources,
  search_notes: searchNotes,
  minimum_score: currentConfig.minimumScore,
  reranker: currentConfig.reranker,
})
```

**Step 3: Render Configuration Panel UI**
Replace the simple Rerank toggle button in `page.tsx` with a gear-icon button "Search Config" that toggles `showConfig`.
When `showConfig` is true, render a beautiful glassmorphic panel containing:
- "Max Results" slider (limit: 5 to 200, step 5)
- "Min Relevance Score" slider (minimumScore: 0.0 to 1.0, step 0.05)
- "Enable Reranking" toggle checkbox.

**Step 4: Verify frontend type-safety**
Run: `cd frontend && npx tsc --noEmit`
Expected: Success with no type check errors.

**Step 5: Commit**
```bash
git add frontend/src/app/\(dashboard\)/search/page.tsx
git commit -m "feat(search): add dynamic search config sliders and reranker toggle"
```

---

### Task B: Reranker Admin Sandbox Comparison Tool

**Files:**
- Modify: [search.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/search.py)
- Create: [RerankerSandbox.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/advanced/components/RerankerSandbox.tsx)
- Modify: [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/advanced/page.tsx)
- Test: [test_search_compare.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_search_compare.py)

**Step 1: Write the failing test**
Create `tests/test_search_compare.py` with:
```python
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_search_comparison_endpoint():
    response = client.post(
        "/api/search/compare",
        json={"query": "test query", "limit": 5}
    )
    assert response.status_code == 200
    data = response.json()
    assert "raw_latency" in data
    assert "reranked_latency" in data
    assert "raw_results" in data
    assert "reranked_results" in data
```

**Step 2: Run test to verify it fails**
Run: `pytest tests/test_search_compare.py -v`
Expected: FAIL with `404 Not Found`.

**Step 3: Implement compare endpoint in API**
In `api/routers/search.py`, add the endpoint `POST /api/search/compare`:
- Run vector search without reranking, measure latency.
- Run vector search with reranking, measure latency.
- Return latencies, score deltas, and result items side-by-side.

**Step 4: Build comparison Sandbox React Component**
Create `frontend/src/app/(dashboard)/advanced/components/RerankerSandbox.tsx`:
- Simple search field + Compare button.
- Displays raw vs. reranked search results side-by-side.
- Highlights latency delta and changes in relative positions of results.
Integrate this component inside `frontend/src/app/(dashboard)/advanced/page.tsx`.

**Step 5: Run tests to verify they pass**
Run: `pytest tests/test_search_compare.py -v`
Expected: PASS.
Verify frontend: `cd frontend && npx tsc --noEmit`.

**Step 6: Commit**
```bash
git add api/routers/search.py frontend/src/app/\(dashboard\)/advanced/ tests/test_search_compare.py
git commit -m "feat(advanced): build raw vs reranked sandbox tool and comparison endpoint"
```

---

### Task C: CSET Historical Audit Logging

**Files:**
- Modify: [models.py](file:///Users/jimmcknney/notebook_tetrel/api/models.py)
- Modify: [assessments.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/assessments.py)
- Test: [test_cset_snapshot.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_cset_snapshot.py)

**Step 1: Write the failing test**
Create `tests/test_cset_snapshot.py`:
```python
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_session_complete_snapshot():
    # Attempt to complete a mock session and check that the response includes a snapshot
    session_id = "mock-session-id"
    res = client.post(f"/api/sessions/{session_id}/complete")
    # Will fail with 404 since mock-session-id does not exist, but let's test a valid session setup
```
Write a proper test that registers a session, completes it, and checks that `compliance_snapshot` is present with compliance score and category coverage lists.

**Step 2: Run test to verify it fails**
Run: `pytest tests/test_cset_snapshot.py -v`
Expected: FAIL.

**Step 3: Implement historical snapshot on completion**
- Modify `AssessmentSessionResponse` in `api/models.py` to include `compliance_snapshot: Optional[ComplianceSnapshot] = None`.
- In `api/routers/assessments.py`, inside `complete_session`:
  - Calculate overall compliance score and category coverages.
  - Persist this snapshot as a field `snapshot` on the session record in SurrealDB.
  - Load the snapshot when returning the completed session.

**Step 4: Run tests to verify they pass**
Run: `pytest tests/test_cset_snapshot.py -v`
Expected: PASS.

**Step 5: Commit**
```bash
git add api/models.py api/routers/assessments.py tests/test_cset_snapshot.py
git commit -m "feat(compliance): save historical compliance snapshots upon session completion"
```

---

### Task D: Inline SOW Drafting Autocomplete

**Files:**
- Modify: [agents.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/agents.py)
- Modify: [B2BDraftingWorkspace.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/notebooks/components/B2BDraftingWorkspace.tsx)
- Test: [test_draft_copilot.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_draft_copilot.py)

**Step 1: Write the failing test**
Create `tests/test_draft_copilot.py`:
```python
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_draft_copilot_endpoint():
    res = client.post(
        "/api/agents/draft/copilot",
        json={"text": "Initial draft SOW sentence.", "action": "expand"}
    )
    assert res.status_code == 200
    assert "suggestion" in res.json()
```

**Step 2: Run test to verify it fails**
Run: `pytest tests/test_draft_copilot.py -v`
Expected: FAIL with `404 Not Found`.

**Step 3: Implement copilot backend endpoint**
- Add the `POST /api/agents/draft/copilot` endpoint to `api/routers/agents.py`.
- Load custom prompts for the "Drafting Copilot" agent if available.
- Call the default chat model using the custom/default system instructions to perform `expand`, `rewrite`, or `autocomplete` on the provided text context.

**Step 4: Implement SOW Editor inline controls in Frontend**
- Modify `B2BDraftingWorkspace.tsx` to add a Drafting Copilot toolbar above `MarkdownEditor`.
- Implement selection grabbing from the editor container to populate the prompt field.
- Show suggestions dynamically with options to Replace Selection, Insert at Cursor/End, or Discard.

**Step 5: Run tests and verify type check**
Run: `pytest tests/test_draft_copilot.py -v`
Run: `cd frontend && npx tsc --noEmit`
Expected: PASS and zero TypeScript compilation errors.

**Step 6: Commit**
```bash
git add api/routers/agents.py frontend/src/app/\(dashboard\)/notebooks/components/B2BDraftingWorkspace.tsx tests/test_draft_copilot.py
git commit -m "feat(drafting): wire drafting copilot agent into sow editor with inline suggestions"
```
