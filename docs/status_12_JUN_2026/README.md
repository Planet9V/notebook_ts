# Tetrel Notebook — Status Report: June 12, 2026

> **Generated:** 2026-06-12 · **Author:** Antigravity AI Audit  
> **Scope:** Full codebase, documentation, GitHub, and operational state

---

## Report Index

| File | Contents |
|---|---|
| [01-codebase-inventory.md](./01-codebase-inventory.md) | Complete itemization of all folders, files, and documentation locations |
| [02-system-state.md](./02-system-state.md) | Actual current state of all subsystems vs. documentation |
| [03-documentation-differential.md](./03-documentation-differential.md) | Stale, duplicate, inaccurate, and missing documentation analysis |
| [04-github-issues.md](./04-github-issues.md) | GitHub open issues, pending PRs, and upstream divergence |
| [05-action-plan.md](./05-action-plan.md) | Actionable, prioritized plan (multi-agent reviewed + concise checklist) |

---

## TL;DR — Critical Findings

### 🔴 Blockers
1. **3 test files fail to collect** (`test_bento_enhancements.py`, `test_bento_mockup.py`, `test_loom_mockup.py`) — broken Playwright imports block all test suite runs
2. **5 uncommitted modified files** including `voice.py`, `voice_sessions.py`, `voice_tools.py`, `page.tsx`, `TTSConfigCard.tsx` — TTS fix and landing page cleanup not committed
3. **47 routers registered** in `api/main.py` but `GEMINI.md` claims 49 — discrepancy
4. **49 SurrealDB migrations** on disk but `GEMINI.md` says "46+"  — stale count

### 🟡 Warnings
5. **Next.js version** is `^16.2.6` (actual) vs. `Next.js 15` / `Next.js 16` used inconsistently across docs
6. **Documentation fragmentation** — 7+ separate doc locations with overlapping and contradicting content
7. **`progress.md` and `task_plan.md`** in root still show in-progress items from the 7 Perspectives wiring — never marked complete or archived
8. **`docs/status-june-8-2026/`** is fully stale (4 days old) — June 12 state is significantly different
9. **2 Dependabot PRs** open on Planet9V/notebook_ts — dependency bumps unreviewed
10. **Upstream divergence** — 67 commits ahead of `lfnovo/open-notebook` upstream with no plan to merge or fork-synchronize

### 🟢 Confirmed Working
- Docker compose stack running healthy (6 services)
- TTS voice fix deployed (67 voices, voice selection now DB-driven)
- Landing page cleaned to single Perspective+ view
- `npx tsc --noEmit` — clean
- Backup/restore system implemented (migration 49)
- 68 test files exist, ~65 non-broken tests passing
