# Specification: Styleguide Exporter & Google Workspace Connectors

**Track ID:** google-workspace-exporter_20260609
**Type:** Feature
**Created:** 2026-06-09
**Status:** Draft

## Summary
Implement Google Drive and Workspace export capabilities (Docs, Sheets, Slides) linked to dynamic database-configured client style guides, secured by Vault-referenced OAuth credential management.

## User Story
As a Consultant or Researcher, I want to export my notebook markdown contents, CSET scorecard sheets, and React Flow topology canvas nodes natively into branded Google Docs, Sheets, and Slides, so that I can deliver professional documents to clients with zero manual styling.

## Acceptance Criteria
- [ ] Create SurrealQL migrations to pre-seed the `credential` entry representing `google_workspace`.
- [ ] Build a credentials configuration panel in the Admin UI allowing admins to configure Client ID, Client Secret, and scopes securely (referencing Vault keys).
- [ ] Implement Google OAuth redirect callback handler `/api/credentials/oauth/callback` to safely exchange auth codes and save encrypted refresh tokens in SurrealDB.
- [ ] Update `compile_markdown_to_docx` to load dynamic styles (fonts, margins, colors, logos) from the customer's active `StyleGuide` database model.
- [ ] Add `POST /notebooks/export/gdocs` supporting branded Google Docs generation.
- [ ] Add `POST /notebooks/export/gslides` converting React Flow canvas nodes/edges to Slide shapes.
- [ ] Add `POST /notebooks/export/gsheets` generating structured compliance checklists.
- [ ] Create automated integration tests verifying token exchange, styleguide generation, and Drive uploads.
