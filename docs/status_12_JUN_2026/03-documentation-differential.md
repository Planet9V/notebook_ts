# Documentation Differential — June 12, 2026

> Analysis of stale, duplicate, inaccurate, and missing documentation across the codebase.  
> Severity: 🔴 Critical | 🟡 Warning | 🟢 Informational

---

## 1. Inaccurate / Outdated Claims

### 🔴 CRITICAL: Router Count Wrong in GEMINI.md

**Location**: `GEMINI.md` line 145  
**Claims**: `"49 Routers"` in API Structure section  
**Actual**: 47 `include_router()` registrations in `api/main.py`  
**Impact**: Onboarding confusion; agents generate wrong counts in plans  
**Fix**: Update GEMINI.md (and CLAUDE.md) to `47 registered routers (49 router files including __init__.py)`

---

### 🔴 CRITICAL: Next.js Version Inconsistent Across 3+ Docs

| Document | Claimed Version | Actual |
|---|---|---|
| `docs/7-DEVELOPMENT/architecture.md` line 60 | `Next.js 15 with React 19` | `^16.2.6` |
| `docs/7-DEVELOPMENT/architecture.md` line 55 | `React/Next.js @ port 3000` | Port is 8502 (or 3000 in dev) |
| `GEMINI.md` | Not explicitly stated | `^16.2.6` |
| `docs/status-june-8-2026/system-architecture-fullstack.md` | `Next.js 15` | `^16.2.6` |

**Fix**: Standardize to `Next.js 16 (^16.2.6) / React 19` everywhere

---

### 🔴 CRITICAL: Architecture.md Says "port 3000" for Frontend

**Location**: `docs/7-DEVELOPMENT/architecture.md` line 55  
**Claims**: `React/Next.js @ port 3000`  
**Actual**: Port 8502 in Docker; port 3000 in local dev. Docs mix these up  
**Fix**: Distinguish Docker port (8502) from local dev port (3000) explicitly

---

### 🟡 WARNING: Migration Count Understated in GEMINI.md

**Location**: `GEMINI.md` line 128  
**Claims**: `"46+ migrations in open_notebook/database/migrations/"`  
**Actual**: 49 migrations (through migration 49 — backup/backup_schedule tables)  
**Fix**: Update to `"49 migrations"`

---

### 🟡 WARNING: Graphify Node Count Stale in GEMINI.md

**Location**: `GEMINI.md` line 94  
**Claims**: `"10,225 nodes · 13,722 links · 1,000 files indexed"`  
**Actual**: Likely stale — 67 commits of new features since last graphify update  
**Fix**: Run `graphify update .` and update the counts

---

### 🟡 WARNING: Architecture.md Describes Only ~11 Routers

**Location**: `docs/7-DEVELOPMENT/architecture.md` line 104–111  
**Claims**: Lists 7 routers explicitly + `"11 additional routers"`  
**Actual**: 47 routers registered; docs severely understates the surface area  
**Fix**: Point to `api/routers/` directory instead of trying to enumerate

---

### 🟡 WARNING: docs/architecture.md in Root (Duplicate)

**Location**: `docs/architecture.md` (root of docs, 1.8KB, May 22)  
**vs**: `docs/7-DEVELOPMENT/architecture.md` (34KB, Jun 2)  
**Problem**: Two files named `architecture.md`, the root one is a tiny stub  
**Fix**: Delete or redirect `docs/architecture.md` to `docs/7-DEVELOPMENT/architecture.md`

---

## 2. Stale Documentation (No Longer Reflects Reality)

### 🔴 CRITICAL: `progress.md` Shows Incomplete Work Items

**Location**: `/progress.md` (root)  
**Problem**: Contains in-progress (`[/]`) and incomplete (`[ ]`) items from the 7 Perspectives wiring session. This file was never marked complete. A new developer reading this would think the platform is mid-build.  
**Items marked in-progress but actually completed**:
- `[/] Design detailed wiring mapping and gap analysis for remaining Perspectives.`
- `[/] Implement live Project Delivery portfolio locations tree, details card, and activity stream logs.`
- `[/] Implement live Marketing Studio scheduled episodes and TTS speech playback.`
**Fix**: Archive to `docs/plans/` with completion note, or add completion status

---

### 🔴 CRITICAL: `task_plan.md` Shows Mid-Build State

**Location**: `/task_plan.md` (root)  
**Problem**: Same as above — multi-perspective wiring plan with incomplete items that ARE actually done (commits confirm they were built). Confusing for session handoff.  
**Fix**: Archive with completion dates or delete

---

### 🟡 WARNING: `docs/status-june-8-2026/` is Fully Superseded

**Location**: `docs/status-june-8-2026/` (11 files)  
**Problem**: This directory captured state as of June 8. Since then:
- Voice TTS bug fixed
- Landing page cleaned (removed mockups 1–6)
- Voice session list endpoint fixed  
- `/voice/config` now returns 67 live voices (was 11)
- 3 more router bug fixes (2c867c4)
**Fix**: Leave in place as historical record, but add a banner note in its `README.md` pointing to the June 12 status

---

### 🟡 WARNING: `docs/implementation_plan.md` is Archival

**Location**: `docs/implementation_plan.md` (Jun 2)  
**Problem**: References implementation plans for features now completed. Title suggests it's current but it's not.  
**Fix**: Move to `docs/plans/archive/` or rename with date prefix

---

### 🟡 WARNING: `docs/0-START-HERE/` through `docs/3-USER-GUIDE/` All Frozen May 21

**Problem**: Entire user-facing documentation untouched since May 21 despite 67 new commits including major features (Voice AI, Social Media Builder, Compliance Canvas, Backup System, Podcast Target Duration, etc.)  
**Fix**: Requires coordinated documentation sprint

---

### 🟡 WARNING: `docs/SECURITY_REVIEW.md` is 3 Weeks Old

**Location**: `docs/SECURITY_REVIEW.md` (May 21, 2026)  
**Problem**: Security review predates major feature additions (voice auth, OAuth credentials, API key management, backup/restore endpoint). All new surface area un-reviewed.  
**Fix**: Schedule security re-review for new features

---

## 3. Duplicate Documentation (Same Content in Multiple Places)

### 🔴 CRITICAL: Architecture Described in 4+ Places

| File | Coverage |
|---|---|
| `docs/architecture.md` | 1.8KB stub |
| `docs/7-DEVELOPMENT/architecture.md` | 34KB comprehensive |
| `GEMINI.md` (Architecture section) | Summary |
| `docs/wiki/architecture.md` | Wiki version |
| `docs/status-june-8-2026/system-architecture-fullstack.md` | Point-in-time |
| `open_notebook/CLAUDE.md` | In-code summary |

**Problem**: All 6 versions diverge. New developers read whichever they find first.  
**Fix**: Single source of truth in `docs/7-DEVELOPMENT/architecture.md`, all others link to it

---

### 🟡 WARNING: Voice Subsystem Documented in 3 Places

| File | Coverage |
|---|---|
| `docs/wiki/voice-subsystem.md` | User-facing |
| `GEMINI.md` (Voice AI section) | Dev reference |
| `docs/7-DEVELOPMENT/architecture.md` (Voice section) | Technical |

**Problem**: Voice fix (June 12) updates none of these automatically.  
**Fix**: Consolidate to `docs/wiki/voice-subsystem.md` + update after each fix

---

### 🟡 WARNING: API Reference in 3 Places

| File |
|---|
| `docs/API_CONTRACTS.md` |
| `docs/7-DEVELOPMENT/api-reference.md` |
| `docs/wiki/api-reference.md` |

**Fix**: Designate `docs/wiki/api-reference.md` as primary, others redirect/link

---

### 🟡 WARNING: Agent Instructions Split Between GEMINI.md and CLAUDE.md

**Problem**: Both files claim to be the authoritative source. Over time they WILL drift.  
**Current state**: Still synchronized, but manually maintained.  
**Fix**: One file should `include` the other, or generate from a shared source

---

## 4. Missing Documentation

### 🔴 CRITICAL: No `CLAUDE.md`/`GEMINI.md` in `api/` directory

The `api/` layer (47 routers, 4 background workers, lifespan logic) has **zero in-code documentation**. All other top-level modules (`open_notebook/`, `prompts/`) have `CLAUDE.md` files.  
**Fix**: Create `api/CLAUDE.md` covering router categories, registration pattern, background workers

---

### 🔴 CRITICAL: No Test Strategy Document

68 test files, 436 passing, 53 failing — but no document explains:
- Why are 53 tests failing? (expected — need live DB)
- Which tests need real DB vs. can mock?
- How to run tests locally vs. CI?
- Why are 3 test files using Playwright but `playwright` isn't installed?  
**Fix**: Create `tests/STRATEGY.md`

---

### 🟡 WARNING: No `CONTRIBUTING.md` Update Since May 21

`docs/7-DEVELOPMENT/contributing.md` dates from May 21 and pre-dates the new TDD workflow, Karpathy rules, GEMINI.md instructions, and the Conductor scaffolding system.  
**Fix**: Update contributing guide

---

### 🟡 WARNING: Backup/Restore System Undocumented in Main Docs

Migration 49 added the full backup/restore system — but it's only documented in `docs/8-PAGES.md` (as part of the page tree). The `docs/3-USER-GUIDE/` and `docs/6-TROUBLESHOOTING/` sections have nothing about backup.  
**Fix**: Add `docs/3-USER-GUIDE/backup-restore.md`

---

### 🟡 WARNING: Social Creator / Media Hub Undocumented

The Social Media Builder tab in `/media` was added in `83a3cb4` — no user-facing documentation exists for it.  
**Fix**: Add to `docs/3-USER-GUIDE/`

---

### 🟡 WARNING: Reranker Toggle Status Unclear

The search page reportedly needs a reranker toggle wired — referenced in previous session summaries but no clear tracking issue or doc.  
**Fix**: Add to `docs/plans/` as a tracked work item

---

## 5. Scatter Analysis — Documentation Sprawl

### Files in wrong locations

| File | Current Location | Correct Location |
|---|---|---|
| `task_plan.md` | Root | `docs/plans/` |
| `progress.md` | Root | Archive in `docs/plans/archive/` |
| `taskmaster_report.md` | Root | `docs/plans/archive/` |
| `option_a_entity_notes.md` | Root | `docs/plans/archive/` |
| `findings_brainstorm.md` | Root (untracked) | `docs/plans/` |
| `TEST_INFRA.md` | Root (untracked) | `docs/` or `tests/` |
| `TEST_READY.md` | Root (untracked) | `docs/` or `tests/` |
| `CLAUDE.md.pre-ruflo` | Root (untracked) | Delete or `.gitignore` |

### Duplicate status directories

| Directory | Problem |
|---|---|
| `docs/status-june-8-2026/` | Superseded |
| `docs/status_12_JUN_2026_/` | Empty directory with trailing underscore — typo |
| `docs/status_12_JUN_2026/` | **This report** — correct |

**Fix**: Delete `docs/status_12_JUN_2026_/` (empty typo directory)

---

## 6. Summary Score

| Category | Issues Found | Critical | Warning |
|---|---|---|---|
| Inaccurate claims | 6 | 3 | 3 |
| Stale docs | 6 | 2 | 4 |
| Duplicate docs | 4 | 1 | 3 |
| Missing docs | 5 | 2 | 3 |
| Misplaced files | 8 | 0 | 8 |
| **TOTAL** | **29** | **8** | **21** |
