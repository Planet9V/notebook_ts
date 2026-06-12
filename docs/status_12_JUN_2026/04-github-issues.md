# GitHub Issues & Outstanding Problems — June 12, 2026

---

## 1. Planet9V/notebook_ts — Open Issues

| # | Title | Type | Priority |
|---|---|---|---|
| #2 | `chore(deps): bump the uv group across 1 directory with 2 updates` | Dependabot dependency | 🟡 Medium |
| #1 | `chore(deps): bump the npm_and_yarn group across 1 directory with 2 updates` | Dependabot dependency | 🟡 Medium |

**Action**: Review and merge both Dependabot PRs. Check for breaking changes in uv bump before merging.

---

## 2. Upstream (lfnovo/open-notebook) — Relevant Open Issues

These are upstream issues that *may* have relevance to this fork:

| # | Title | Relevance |
|---|---|---|
| #876 | Fix legacy embedding jobs after command rename | 🔴 Potentially affects embedding worker |
| #875 | Ollama `num_ctx` credential override is never persisted | 🟡 Affects Ollama users |
| #872 | AI provider setup instructions are outdated in README | 🟡 Documentation gap |
| #869 | Native Multi-User Support and Workspace Isolation | 🟡 Feature gap — not implemented here |
| #867 | Tags or collective notebooks | 🟡 Feature gap |
| #865 | Enhance `export_docs.py` with Table of Contents | 🟢 Nice to have |

**Key issue #876**: The upstream `embedding job command rename` fix may apply here. Check if embedding workers in `open_notebook/tasks/` are affected.

---

## 3. Outstanding Problems (Found in Codebase Audit)

### 🔴 P1: 53 Failing Tests — Not All Require Live DB

**Details**: Of the 53 failing tests:
- ~40 fail due to no live SurrealDB during test run (expected in unit test mode)
- ~10 may be genuine bugs (voice AI stage2, podcast concurrency, search comparison)
- 3 files won't even collect due to missing `playwright` package

**Most urgent**: `test_voice_ai_stage2.py` (4 tests) — directly tests the settings API that was **just changed** by the TTS voice fix. These failures need investigation:
```
FAILED test_voice_ai_stage2.py::TestExpandedVoiceSettings::test_settings_returns_multi_engine_fields
FAILED test_voice_ai_stage2.py::TestExpandedVoiceSettings::test_settings_api_key_flags_are_booleans
FAILED test_voice_ai_stage2.py::TestExpandedVoiceSettings::test_settings_update_accepts_multi_engine_fields
FAILED test_voice_ai_stage2.py::TestExpandedVoiceSettings::test_settings_update_and_token_generation_remote
```

---

### 🔴 P2: TTS Fix Not Committed

5 modified files with the complete TTS voice fix and landing page cleanup are sitting uncommitted:
```
M api/routers/voice.py
M api/routers/voice_sessions.py
M api/routers/voice_tools.py
M frontend/src/app/(dashboard)/page.tsx
M frontend/src/app/(dashboard)/settings/voice/components/TTSConfigCard.tsx
```
**Risk**: Any container rebuild or reset loses these changes. They must be committed.

---

### 🔴 P3: Playwright Tests Broken (3 Files, Collection Error)

```python
# All three files have:
from playwright.sync_api import sync_playwright
```
But `playwright` is not in `.venv`. These tests were written but never validated to run.  
**Files**: `test_bento_enhancements.py`, `test_bento_mockup.py`, `test_loom_mockup.py`  
**Options**:
1. Install `playwright` and `pytest-playwright` in dev dependencies
2. Move these to a separate `tests/e2e/` folder with a README explaining they need `playwright install`
3. Skip-mark them conditionally

---

### 🟡 P4: Search Page Reranker Toggle Not Wired

Referenced in previous session summaries as a pending task:
> "Wire reranker toggle on `/search` page"  
> "Add reranker 'Test' button in Admin UI"

No code evidence of these being implemented. The `/search` page has a mode selector (local vs. hybrid) but no reranker toggle wired to the backend reranker configuration.  
**Status**: **Not started**

---

### 🟡 P5: 67 Commits Ahead of Upstream — No Sync Plan

This fork has diverged significantly from `lfnovo/open-notebook`:
- 67 custom commits
- Custom features: CRM, Compliance Canvas, Voice Tools, Social Builder, Backup, etc.
- No merge-back plan documented
- No changelog distinguishing fork-specific vs. upstream features

**Risk**: Upstream bug fixes (like #876 embedding command rename) will not flow in automatically.  
**Options**:
1. Formally declare this a product fork and maintain independently
2. Cherry-pick upstream security/bug patches periodically
3. Maintain a `FORK.md` listing all divergences

---

### 🟡 P6: 6 Untracked Root-Level Files

```
?? CLAUDE.md.pre-ruflo       ← Should be in .gitignore
?? TEST_INFRA.md             ← Should be moved to tests/ or docs/
?? TEST_READY.md             ← Should be moved to tests/ or docs/
?? findings_brainstorm.md    ← Should be in docs/plans/
?? package-lock.json         ← Root package.json (ruflo CLI?)
?? package.json              ← Root package.json — should this be committed?
```

The root `package.json` and `package-lock.json` appear to be from `npx ruflo` CLI calls. These should either be committed or gitignored.

---

### 🟡 P7: Empty Typo Directory

`docs/status_12_JUN_2026_/` — trailing underscore, empty directory.  
**Fix**: `rmdir docs/status_12_JUN_2026_/`

---

### 🟡 P8: Voice AI Stage 2 Tests May Indicate API Contract Drift

The `test_voice_ai_stage2.py` tests validate:
- `test_settings_returns_multi_engine_fields` — checks API response shape
- `test_settings_api_key_flags_are_booleans` — checks field types
- `test_settings_update_accepts_multi_engine_fields` — tests PATCH endpoint

These were written for a specific API contract. The TTS fix modified `voice_sessions.py` and may have changed response shapes. **Needs investigation before committing the TTS fix.**

---

### 🟢 P9: Dependabot Security Updates — Review Needed

GitHub Dependabot has flagged:
- uv group dependency bump (issue #2)
- npm_and_yarn group bump (issue #1)

Both should be reviewed for breaking changes. The npm bump may affect the frontend build.

---

## 4. Potential Issues (Risk Flags)

| Risk | Severity | Description |
|---|---|---|
| No auth on voice endpoints | 🔴 High | Voice routes (`/api/voice/*`) — check if auth middleware covers them |
| Backup endpoint security | 🔴 High | `POST /api/backup/restore` drops all DB tables. Is this behind auth? |
| Missing rate limiting | 🟡 Medium | No evidence of rate limiting on heavy endpoints (search, synthesis, embeddings) |
| No CORS policy documented | 🟡 Medium | Frontend proxies to backend but CORS config not documented |
| SQLite checkpoints in backup | 🟡 Medium | Backup includes `checkpoints.sqlite` — LangGraph state. Large files could cause slow backups |
| `graphify-out/` accumulation | 🟢 Low | 50+ dated output directories taking disk space — no cleanup policy |
| `scratch/` accumulation | 🟢 Low | Many scratch files from development sessions — not gitignored cleanly |
