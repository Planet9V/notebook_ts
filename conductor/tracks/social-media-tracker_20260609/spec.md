# Specification: Social Media Cron Tracker & Metrics Dashboard

**Track ID:** social-media-tracker_20260609
**Type:** Feature
**Created:** 2026-06-09
**Status:** Draft

## Summary
Implement a timeseries Reach line chart on the Publications Dashboard to render views, clicks, and interactions of published content over time, filterable by individual social channels (LinkedIn, Twitter, Email, or All).

## Acceptance Criteria
- [ ] Add `getMetricsHistory` API call in `frontend/src/lib/api/publications.ts` mapping to `GET /api/publications/metrics/history`.
- [ ] Add the `PublicationMetricsHistoryEntry` model in `frontend/src/lib/types/publications.ts`.
- [ ] Render a custom SVG line chart on the Publications Dashboard `frontend/src/app/(dashboard)/publications/page.tsx`.
- [ ] The SVG line chart must include area gradients, grid lines, dynamic coordinate plotting, and responsive sizing.
- [ ] Add a channel selector dropdown (All, LinkedIn, Twitter, Email) that filters the timeseries data dynamically in the SVG.
- [ ] All code must compile cleanly with `npx tsc --noEmit`.
