# Task Plan: CISA 16 USA Critical Infrastructure Sectors Alignment

This document outlines the systematic implementation plan to update Tetrel's compliance framework engine to align with the official **16 USA Critical Infrastructure Sectors** defined by CISA and DHS.

---

## 1. Goal
Replace the existing basic sector designations with the 16 official CISA sectors. Support multi-sector classification for all 66 frameworks to enable high-fidelity filtering and mapping in the database and Next.js frontend, ensuring full backward compatibility and 100% test suite safety.

---

## 2. Design Choices

### Database Schema Upgrade
- Keep the `sector` string field on the `regulation` table for backward compatibility, mapping each regulation to its *Primary CISA Critical Sector* (or `"Cross-Sector"`).
- Add the `sectors` list of strings field to store *all* CISA sectors applicable to a given framework.

### Backend APIs
- Update `RegulationResponse` in `api/models.py` to include `sectors: Optional[List[str]] = Field(default_factory=list)`.
- Update `get_regulations` in `api/routers/regulations.py` to fetch `sectors` from SurrealDB records, falling back to `[sector]` if empty to ensure robustness.

### Database Seeder
- Update all 66 framework objects in `scripts/generate_cset_library.py` to reflect their correct primary `sector` (from the CISA 16 or `"Cross-Sector"`) and secondary `sectors` array.
- Clear and reseed the SurrealDB instance with the updated regulations and deduplicated controls/questions.
- Regenerate individual JSON/Markdown blueprints via `scripts/generate_individual_framework_artifacts.py` to keep the artifacts folder in lockstep.

### Frontend UI
- Update `CSETFramework` interface in `frontend/src/app/(dashboard)/compliance/page.tsx` to include `sectors: string[]` and expand the `sector` type list.
- Update `CSET_FRAMEWORKS_RAW` fallback data with the identical multi-sector schema to prevent fallback crashes.
- Redefine `const sectors = [...]` array to list all 16 CISA sectors, `'Cross-Sector'`, and `'ALL'`.
- Modify `matchesSector` filtering logic:
  `const matchesSector = selectedSector === 'ALL' || fw.sectors.includes(selectedSector) || fw.sector === selectedSector`
- Update card tags and badges to support rendering either the primary sector or the list of sectors elegantly.

---

## 3. Implementation Checklist

### Phase 1: Research & Plan Creation
- [x] Research official CISA 16 sectors & subsectors from DHS and CISA portals.
- [x] Create comprehensive `findings.md` mapping all 66 regulations to the 16 critical sectors.
- [x] Author detailed `task_plan.md` mapping out execution phases.
- [x] Initialize session tracking in `progress.md`.

### Phase 2: Schema & Model Upgrades
- [x] Add `sectors` field to `RegulationResponse` in `api/models.py`.
- [x] Update SurrealDB query mapping in `api/routers/regulations.py` to retrieve `sectors`.

### Phase 3: Seeder Refactoring & Reseeding
- [x] Update `validate_regulation` in `scripts/generate_cset_library.py` to inspect `sectors` list.
- [x] Refactor the `FRAMEWORKS` definitions list in `scripts/generate_cset_library.py` with CISA primary and secondary sectors.
- [x] Execute `scripts/generate_cset_library.py` to populate SurrealDB.
- [x] Execute `scripts/generate_individual_framework_artifacts.py` to rebuild static artifacts.
- [x] Run database check `scratch/check_db.py` to verify ingestion integrity.

### Phase 4: Frontend UI Refactoring
- [x] Refactor the `CSETFramework` interface in `frontend/src/app/(dashboard)/compliance/page.tsx`.
- [x] Update `CSET_FRAMEWORKS_RAW` static fallbacks with CISA sector schemas in `page.tsx`.
- [x] Refactor filtering logic and `sectors` list in `page.tsx`.
- [x] Run `npx tsc --noEmit` inside `frontend/` to confirm complete compile safety.

### Phase 5: Verification & Verification
- [x] Run Python pytest suite `pytest` to guarantee 100% test success.
- [x] Run `.venv/bin/python scratch/verify_all_directives.py` to verify hydration completeness.
- [x] Author a detailed walkthrough summarizing changes and achievements.
