# Action Plan — June 12, 2026

> Generated via multi-agent structured review (Designer → Skeptic → Constraint Guardian → User Advocate → Arbiter)

---

## Multi-Agent Design Review

### 🏗️ Primary Designer Proposal

**Goal**: Address 29 documentation issues + 9 outstanding problems in a prioritized, atomic plan without over-engineering. Group into 4 sprints: Commit Now → Fix Breaking → Documentation → Cleanup.

**Approach**: 
- Sprint 0: Commit existing work (non-negotiable, immediate)
- Sprint 1: Fix the 3 P1 blockers (test failures affecting CI confidence)
- Sprint 2: Fix the 8 critical documentation inaccuracies  
- Sprint 3: Address documentation consolidation and missing docs
- Sprint 4: Cleanup, security review, upstream sync decision

---

### 🔍 Skeptic / Challenger

> **Objection 1**: The `test_voice_ai_stage2.py` failures weren't investigated before committing the TTS fix. Committing now risks shipping a broken API contract.  
> **Mitigation**: Run `test_voice_ai_stage2.py` explicitly against the live container before committing. If they fail, diagnose first.

> **Objection 2**: The "documentation sprint" approach always gets deprioritized in favor of features. Without a hard gate (like a CI doc-lint check), this stays perpetually backlogged.  
> **Mitigation**: Add a `docs:validate` script that at minimum checks for broken links and verifies GEMINI.md version numbers match `package.json`.

> **Objection 3**: The Sprint 4 "upstream sync decision" is too vague. It'll never happen without a concrete owner and deadline.  
> **Mitigation**: Make it binary: **"Write FORK.md declaring intent"** — not "decide to sync."

---

### 🛡️ Constraint Guardian

> **Constraint 1**: Committing 5 files at once without reviewing `test_voice_ai_stage2.py` first violates Karpathy P3 (TDD). Tests must pass before commit.  
> **Decision**: Run targeted tests BEFORE commit.

> **Constraint 2**: The backup restore endpoint (`POST /api/backup/restore`) drops all DB tables. Verify it's protected by auth middleware before the next release. This is a data destruction risk.

> **Constraint 3**: Don't reorganize root-level files (progress.md, task_plan.md) in the same commit as code changes — it pollutes git history. Do file moves in a separate, labeled commit.

---

### 👤 User Advocate

> **Observation 1**: From a new developer's perspective, there are 3 things they look for first: README, GEMINI.md/CLAUDE.md, and test status. All three give confusing or wrong information right now.  
> **Priority**: Fix GEMINI.md accuracy (version numbers, router count, migration count) FIRST — it's the AI agent's north star.

> **Observation 2**: The 53 failing tests are alarming on first glance. A simple `tests/STRATEGY.md` explaining "most tests need live DB — run with Docker" would prevent hours of debugging for any new developer.

> **Observation 3**: `progress.md` and `task_plan.md` at the root look like the project is half-finished. They should be clearly marked complete or moved.

---

### ⚖️ Arbiter (Integration & Decision)

**APPROVED** with the following ordered plan:

1. Investigate `test_voice_ai_stage2.py` BEFORE committing TTS fix  
2. Commit TTS fix after confirming test behavior  
3. Fix GEMINI.md inaccuracies first (highest-value single file)  
4. Create `tests/STRATEGY.md` (2nd highest-value — prevents confusion)
5. Create `api/CLAUDE.md` (fills largest documentation gap)
6. Archive/clean root-level files in a separate labeled commit
7. Address Playwright test isolation  
8. Write `FORK.md` to formalize upstream divergence decision

**Decision Log**:

| ID | Decision | Rationale |
|---|---|---|
| D-01 | Investigate voice_ai_stage2 before commit | P3 compliance; don't ship broken tests |
| D-02 | Fix GEMINI.md first | Highest-impact single change for AI agent accuracy |
| D-03 | Create tests/STRATEGY.md | Prevents new dev confusion about 53 "failures" |
| D-04 | Separate file-move commit | Keeps git history clean |
| D-05 | Write FORK.md over "sync plan" | Concrete deliverable; forces binary decision |
| D-06 | Backup endpoint security review | Data destruction risk requires explicit verification |

---

## Actionable Plan (Concise Checklist)

### Scope
- **In**: Commit existing work, fix CI blockers, fix GEMINI.md, create missing docs, clean root
- **Out**: New features, upstream merge, full user guide refresh (separate effort)

---

### Sprint 0 — Commit Existing Work (Do First, ~30 min)

```
[ ] 0.1 Run `.venv/bin/pytest tests/test_voice_ai_stage2.py -v` against live container
[ ] 0.2 If tests fail: diagnose and fix before committing TTS changes
[ ] 0.3 If tests pass: commit 5 modified files with message:
        "fix(voice): wire kokoro_default_voice from DB, add live voice list to /voice/config"
[ ] 0.4 Stage and commit untracked planning files to docs/:
        "chore: move root planning files to docs/plans/archive/"
[ ] 0.5 Add CLAUDE.md.pre-ruflo to .gitignore
[ ] 0.6 Decide: commit root package.json (ruflo) or gitignore it
[ ] 0.7 Remove empty typo dir: `rmdir docs/status_12_JUN_2026_/`
```

---

### Sprint 1 — Fix CI Blockers (~1 hour)

```
[ ] 1.1 Install playwright: add `playwright` + `pytest-playwright` to dev deps
        OR move tests/test_bento_*.py + tests/test_loom_mockup.py to tests/e2e/
        with a README: "Requires: playwright install"
[ ] 1.2 Create tests/STRATEGY.md explaining:
        - Which tests need live DB (integration)
        - Which tests run without DB (unit)  
        - How to run locally with Docker
        - Playwright e2e test requirements
[ ] 1.3 Verify `pytest tests/ -q --ignore=tests/e2e` runs clean (0 collection errors)
[ ] 1.4 Investigate test_voice_ai_stage2.py failures specifically (are they pre-existing or caused by TTS fix?)
```

---

### Sprint 2 — Fix Critical Documentation Inaccuracies (~2 hours)

```
[ ] 2.1 Update GEMINI.md:
        - Line 94: Update graphify node/link counts (run graphify update . first)
        - Line 128: "46+ migrations" → "49 migrations"
        - Line 145: "49 Routers" → "47 registered routers (49 files)"
        - Add voice TTS fix to known-working list
[ ] 2.2 Mirror all changes to CLAUDE.md (same file, same changes)
[ ] 2.3 Update docs/7-DEVELOPMENT/architecture.md:
        - Line 55: "@ port 3000" → "@ port 8502 (Docker) / 3000 (local dev)"
        - Line 60: "Next.js 15" → "Next.js 16 (^16.2.6)"
        - Lines 104-111: Replace specific router list with "47 routers in api/routers/"
[ ] 2.4 Delete docs/architecture.md (stub) and add redirect note in docs/7-DEVELOPMENT/architecture.md
[ ] 2.5 Add banner note to docs/status-june-8-2026/README.md:
        "> ⚠️ This status snapshot was taken June 8, 2026. See docs/status_12_JUN_2026/ for current state."
```

---

### Sprint 3 — Create Missing Documentation (~3 hours)

```
[ ] 3.1 Create api/CLAUDE.md covering:
        - 47 router categories and purpose
        - Background worker lifecycle
        - Router registration pattern
        - Auth middleware scope
[ ] 3.2 Create docs/3-USER-GUIDE/backup-restore.md (backup system user guide)
[ ] 3.3 Create docs/3-USER-GUIDE/voice-chat.md (voice system user guide — updated for TTS fix)
[ ] 3.4 Create docs/3-USER-GUIDE/social-media-builder.md (new feature undocumented)
[ ] 3.5 Update docs/wiki/voice-subsystem.md to reflect TTS fix and 67-voice list
[ ] 3.6 Update docs/7-DEVELOPMENT/contributing.md with TDD workflow, GEMINI.md instructions, Conductor system
```

---

### Sprint 4 — Consolidation & Security (~2 hours)

```
[ ] 4.1 Write FORK.md at repo root declaring:
        - This is a product fork of open-notebook by lfnovo
        - List of fork-specific features
        - Policy for upstream security patches (cherry-pick monthly)
        - Policy for not upstreaming proprietary features
[ ] 4.2 Verify backup restore endpoint (POST /api/backup/restore) requires auth
[ ] 4.3 Verify all /api/voice/* endpoints are covered by auth middleware
[ ] 4.4 Review and merge Dependabot PRs #1 and #2 (after testing)
[ ] 4.5 Add docs:validate script (check GEMINI.md version vs package.json, broken links)
[ ] 4.6 Run graphify update . and update node/link counts in GEMINI.md
[ ] 4.7 Clean up graphify-out/ directory (keep latest, archive old — or gitignore entirely)
```

---

### Validation

```
[ ] V.1 Run .venv/bin/pytest tests/ --ignore=tests/e2e -q → 0 collection errors
[ ] V.2 Run npx tsc --noEmit in frontend/ → 0 errors
[ ] V.3 docker compose up -d --build → all 6 services healthy
[ ] V.4 curl localhost:5055/api/voice/config | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['available_voices']))" → 67
[ ] V.5 Read GEMINI.md with fresh eyes — version numbers match actual package.json
[ ] V.6 git log --oneline -5 → shows clean, well-labeled commits
```

---

## Effort Estimates

| Sprint | Effort | Dependency |
|---|---|---|
| Sprint 0 (Commit) | 30 min | Test investigation first |
| Sprint 1 (CI Blockers) | 1 hr | None |
| Sprint 2 (Doc Fixes) | 2 hr | None (parallel with Sprint 1) |
| Sprint 3 (New Docs) | 3 hr | Sprint 2 done |
| Sprint 4 (Security) | 2 hr | Sprint 0 done |
| **Total** | **~8.5 hrs** | Can be done across 2-3 sessions |

---

## Open Questions

1. **Root `package.json`**: Is this intentional (ruflo CLI config) or accidental? Should it be committed?
2. **Reranker toggle**: Is this planned for the next feature sprint or deprioritized? Should it be tracked as a GitHub issue?
3. **Upstream sync**: Monthly cherry-pick policy or formal independence? This needs an explicit decision to stop carrying the question.
