# Implementation Plan: Social Media Cron Tracker & Metrics Dashboard

**Track ID:** social-media-tracker_20260609
**Spec:** spec.md
**Created:** 2026-06-09
**Status:** [x] Complete

## Phase 1: Frontend Type Mapping & API Client
Add TypeScript types and API integrations for fetching historical reach metrics.

### Tasks
- [x] **Task 1.1**: Define `PublicationMetricsHistoryEntry` model in `frontend/src/lib/types/publications.ts`.
- [x] **Task 1.2**: Implement `getMetricsHistory` function in `frontend/src/lib/api/publications.ts` to call `/api/publications/metrics/history`.

### Verification
- [x] Run `npx tsc --noEmit` in `frontend/` to verify type compilation.

## Phase 2: SVG Chart Layout & Channel Filter
Implement a highly aesthetic, custom SVG timeseries reach graph with filtering controls on the Publications dashboard page.

### Tasks
- [x] **Task 2.1**: Update `frontend/src/app/(dashboard)/publications/page.tsx` to fetch metrics history.
- [x] **Task 2.2**: Build a custom SVG line graph component supporting area gradients, grid lines, and interactive hover tooltips.
- [x] **Task 2.3**: Implement the dropdown channel filter component to toggle metrics by social network.

### Verification
- [x] Verify that the Publications page loads in the browser, SVG plots lines correctly, and selecting different filters updates the SVG path nodes.
