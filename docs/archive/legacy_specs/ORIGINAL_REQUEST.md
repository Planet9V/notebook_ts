# Original User Request

## Initial Request — 2026-06-07T03:33:16-05:00

Fix all P0-P2 gaps discovered in the entity notes feature audit for the notebook_tetrel project. The feature attaches notes to organizations (customers) and sites (facilities/locations) with a rollup view. The implementation is functionally complete but has 2 critical data integrity bugs, 3 missing UX features, and 7 correctness/quality issues.

Working directory: /Users/jimmcknney/notebook_tetrel
Integrity mode: development

## Requirements

### R1. Fix P0 data integrity bugs
- **Customer delete cascade**: When a customer is deleted (`api/routers/customers.py`), clean up `entity_note` edges pointing to that customer (`DELETE entity_note WHERE out = $rec_id`), matching the pattern already used in `locations.py` line 214.
- **Duplicate edge guard**: Add a unique index on `(in, out)` for `entity_note` via a new migration 44. This prevents the same note from being linked to the same entity twice on retries/double-clicks.

### R2. Add edit/delete UI and detach endpoint
- **Edit inline**: Allow editing an existing note's title and content directly from the `NoteCard` component in `NotesTab.tsx`. Use the existing `PUT /api/notes/{note_id}` backend endpoint.
- **Delete from UI**: Add a delete button/confirm on each `NoteCard`. Use the existing `DELETE /api/notes/{note_id}` backend endpoint.
- **Detach endpoint**: Create `DELETE /api/locations/{location_id}/notes/{note_id}` and `DELETE /api/customers/{customer_id}/notes/{note_id}` endpoints that only remove the `entity_note` edge without deleting the note itself. Wire these into the frontend as a "Detach" option.

### R3. Fix frontend quality issues
- **Form reset**: In `NotesTab.tsx` `InlineNoteForm`, move `setTitle('')` and `setContent('')` into the `onSuccess` callback only — don't clear on submit.
- **Error state**: Handle `isError` from `useCustomerNotesRollup` in `NotesTab` — show an error message instead of infinite loading shimmer.
- **Cache invalidation**: Fix `useCreateLocationNote` to invalidate only the parent customer's rollup, not all customers. Pass `customerId` through the mutation context.
- **i18n**: Replace hardcoded English toast strings ('Note added to facility', 'Note added to organization') with `t()` translation calls.

### R4. Fix backend quality issues
- **Mutual exclusion**: Validate that `NoteCreate` cannot have both `location_id` and `customer_id` set simultaneously — return 400 if both are provided.
- **N+1 query**: Optimize the rollup endpoint to fetch all location notes in a single SurrealDB query instead of one query per location.
- **Activity logging**: Emit activity events when notes are created/deleted on entities, following the existing `emit_activity` pattern in `locations.py`.

## Acceptance Criteria

### Data Integrity
- [ ] Deleting a customer removes all `entity_note` edges where `out` = customer ID
- [ ] Creating the same note→entity link twice does NOT create duplicate edges (unique index enforced)
- [ ] Migration 44 exists with the unique index and is registered in `async_migrate.py`

### CRUD Completeness
- [ ] Notes in `NotesTab` can be edited inline (title + content) and saved
- [ ] Notes in `NotesTab` can be deleted with a confirmation dialog
- [ ] Notes can be detached from a location/customer without deleting the underlying note
- [ ] `DELETE /api/locations/{location_id}/notes/{note_id}` returns 200 and only removes the edge
- [ ] `DELETE /api/customers/{customer_id}/notes/{note_id}` returns 200 and only removes the edge

### Frontend Quality
- [ ] Failed note creation does NOT clear the form fields
- [ ] If the rollup API returns an error, a visible error message is shown (not infinite loading)
- [ ] Creating a note on location X only invalidates that customer's rollup cache, not all customers
- [ ] All user-facing toast strings use the `t()` translation function

### Backend Quality
- [ ] `POST /api/notes` with both `location_id` and `customer_id` set returns 400
- [ ] The rollup endpoint makes ≤3 database queries regardless of location count (was N+1)
- [ ] Creating/deleting an entity note emits an activity event visible in the Activity tab

### Compilation Gate
- [ ] `npx tsc --noEmit` in `frontend/` exits with code 0
- [ ] Docker rebuild (`docker compose up -d --build open_notebook`) succeeds
- [ ] Container logs show migration 44 applied successfully
