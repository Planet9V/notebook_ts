# Multi-Location Contacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable linking Contacts to multiple physical Locations within the same parent Organization (Customer), validating assignments, cascading deletes, and providing a checkbox multi-select checklist in the frontend UI.

**Architecture:** Replace the singular `location_id` string field on the SCHEMAFULL `contact` table in SurrealDB with a `location_ids` array field. Update the Python domain models, Pydantic schemas, and API routers to support and validate this multi-location assignment. Refactor the frontend (ContactForm, ContactsPanel, ProfileTab, DealDrawer) to handle arrays and provide a smooth, animated checkbox checklist UI.

**Tech Stack:** Next.js (React/TypeScript), Tailwind CSS, FastAPI (Python), Pydantic v2, SurrealDB, pytest.

---

### Task 1: Database Migration

**Files:**
- Create: `open_notebook/database/migrations/42.surrealql`
- Create: `open_notebook/database/migrations/42_down.surrealql`
- Modify: `open_notebook/database/async_migrate.py`

**Step 1: Write Migration Up**
Write the following SurrealQL query in [42.surrealql](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations/42.surrealql):
```sql
-- Migration 42: Replace contact.location_id with contact.location_ids array
DEFINE FIELD IF NOT EXISTS location_ids ON TABLE contact TYPE option<array<string>> DEFAULT [];

-- Copy existing single location_id into the new location_ids array
UPDATE contact SET location_ids = [location_id] WHERE location_id != NONE AND location_id != NULL;
UPDATE contact SET location_ids = [] WHERE location_ids = NONE OR location_ids = NULL;

-- Remove old field and index
REMOVE INDEX idx_contact_location ON TABLE contact;
REMOVE FIELD location_id ON TABLE contact;
```

**Step 2: Write Migration Down**
Write the following SurrealQL query in [42_down.surrealql](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations/42_down.surrealql):
```sql
-- Migration 42 Down: Rollback contact.location_ids to location_id
DEFINE FIELD IF NOT EXISTS location_id ON TABLE contact TYPE option<string>;
DEFINE INDEX IF NOT EXISTS idx_contact_location ON TABLE contact FIELDS location_id;

-- Copy back first item if any exists
UPDATE contact SET location_id = location_ids[0] WHERE location_ids != NONE AND array::len(location_ids) > 0;

-- Remove the array field
REMOVE FIELD location_ids ON TABLE contact;
```

**Step 3: Register Migration**
Add migration `42` to the list of migrations in [async_migrate.py](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/async_migrate.py):
- Line 201: Add `AsyncMigration.from_file("open_notebook/database/migrations/42.surrealql"),`
- Line 327: Add `AsyncMigration.from_file("open_notebook/database/migrations/42_down.surrealql"),`

**Step 4: Verify**
Verify that database migrations compile and run successfully by restarting services.

---

### Task 2: Backend Domain & Model Refactoring

**Files:**
- Modify: `open_notebook/domain/contact.py`
- Modify: `api/models.py`

**Step 1: Update Domain Contact Model**
Modify [contact.py](file:///Users/jimmcknney/notebook_tetrel/open_notebook/domain/contact.py):
- Remove `"location_id"` from `nullable_fields` list.
- Replace `location_id: Optional[str] = None` with `location_ids: Optional[List[str]] = Field(default_factory=list)`.

**Step 2: Update Pydantic API Models**
Modify [models.py](file:///Users/jimmcknney/notebook_tetrel/api/models.py):
- In `ContactCreate`:
  - Replace `location_id` with `location_ids: Optional[List[str]] = Field(default_factory=list, description="Associated location IDs")`.
- In `ContactUpdate`:
  - Replace `location_id` with `location_ids: Optional[List[str]] = Field(None, description="Associated location IDs")`.
- In `ContactResponse`:
  - Keep `location_id: Optional[str] = None` (legacy fallback).
  - Keep `location_name: Optional[str] = None` (legacy fallback).
  - Add `location_ids: List[str] = Field(default_factory=list, description="Associated location IDs")`.
  - Add `location_names: List[str] = Field(default_factory=list, description="Associated location names")`.

---

### Task 3: API Router Refactoring & Cascade Handling

**Files:**
- Modify: `api/routers/contacts.py`
- Modify: `api/routers/locations.py`

**Step 1: Refactor contacts.py helper _build_contact_response**
Update `_build_contact_response` in [contacts.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/contacts.py):
- Receive `location_names: Optional[List[str]] = None` instead of `location_name: Optional[str] = None`.
- Populate `location_ids` and `location_names`.
- Populate legacy `location_id` (first item of `location_ids` or `None`) and legacy `location_name` (comma-separated list of `location_names` or `None`).

**Step 2: Refactor contacts.py GET /contacts**
Update `get_contacts` route to:
- Gather all unique location IDs from the list of retrieved contact records (supporting both `location_ids` array and legacy `location_id` fallback).
- Batch-resolve all location names.
- Map the list of names for each contact to pass to `_build_contact_response`.

**Step 3: Refactor contacts.py POST /contacts (Create Contact)**
Update `create_contact` route to:
- Validate `location_ids`: If `location_ids` is provided, ensure `customer_id` is set.
- Resolve and normalize all `location_ids` (with `ensure_record_id`).
- Verify all locations exist in the database.
- Verify all locations' `customer_id` matches the contact's `customer_id` (raise `400 Bad Request` if mismatch).
- Populate names for response.

**Step 4: Refactor contacts.py GET /contacts/{contact_id} and PUT /contacts/{contact_id} (Update Contact)**
Update `get_contact` and `update_contact` routes:
- Add same validation for `location_ids` as POST route.
- If `customer_id` is set to None/cleared, automatically clear `location_ids` to `[]`.
- If `customer_id` is updated but not `location_ids`, validate existing `location_ids` against the new `customer_id`.
- Resolve names and return response.

**Step 5: Refactor locations.py delete_location cascade logic**
Modify `delete_location` in [locations.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/locations.py):
- Change nullifying contact location links from `UPDATE contact SET location_id = NONE WHERE location_id = $rec_id` to:
  `UPDATE contact SET location_ids = array::difference(location_ids, [$rec_id]) WHERE location_ids CONTAINS $rec_id;`

---

### Task 4: API Unit Tests

**Files:**
- Modify: `tests/test_contacts_api.py`

**Step 1: Write and Expand Tests**
In [test_contacts_api.py](file:///Users/jimmcknney/notebook_tetrel/tests/test_contacts_api.py):
- Update `MOCK_CONTACT_DATA` to include `location_ids` array.
- Add tests for `location_ids` validation:
  - Attempting to link locations when `customer_id` is null (should return 400).
  - Attempting to link locations belonging to a different customer (should return 400).
  - Updating a contact's customer, causing a mismatch with current locations (should return 400).
- Run and verify all pytest tests pass: `uv run pytest tests/test_contacts_api.py`.

---

### Task 5: Frontend TypeScript Types & React components

**Files:**
- Modify: `frontend/src/lib/types/contact.ts`
- Modify: `frontend/src/components/contacts/ContactForm.tsx`

**Step 1: Update Frontend Contact Types**
Modify [contact.ts](file:///Users/jimmcknney/notebook_tetrel/frontend/src/lib/types/contact.ts):
- Add `location_ids: string[]` and `location_names?: string[]` to `Contact` interface.
- Add `location_ids?: string[]` to `ContactCreate` and `ContactUpdate`.

**Step 2: Refactor ContactForm state and populate logic**
Modify [ContactForm.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/components/contacts/ContactForm.tsx):
- Change `location_id: ''` state property to `location_ids: [] as string[]`.
- Populate `location_ids` in `useEffect` when editing: `contact.location_ids || (contact.location_id ? [contact.location_id] : [])`.
- In `handleSubmit`, pass `location_ids` in payloads.

**Step 3: Build Premium Checkbox Checklist selector**
Replace singular `<select>` in [ContactForm.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/components/contacts/ContactForm.tsx) with a scrollable list containing facility name/type and checkboxes:
- Features smooth CSS transitions and highlights on checked status.
- Resets checklist array to `[]` when parent customer organization is changed.

---

### Task 6: Frontend Displays Refactoring

**Files:**
- Modify: `frontend/src/components/contacts/ContactsPanel.tsx`
- Modify: `frontend/src/app/(dashboard)/customers/[id]/components/ProfileTab.tsx`
- Modify: `frontend/src/app/(dashboard)/pipeline/components/DealDrawer.tsx`

**Step 1: Refactor ContactsPanel location display**
Modify [ContactsPanel.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/components/contacts/ContactsPanel.tsx):
- Replace `contact.location_name` check and display with:
  If `contact.location_names` exists and is non-empty, render all locations joined by commas, e.g. `Locations: Loc A, Loc B`. Else fallback to legacy `contact.location_name`.

**Step 2: Refactor ProfileTab location display**
Modify [ProfileTab.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/customers/[id]/components/ProfileTab.tsx):
- Apply same joint locations rendering logic.

**Step 3: Refactor DealDrawer matching and rendering**
Modify [DealDrawer.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/pipeline/components/DealDrawer.tsx):
- Update `enrichedContacts` memo mapping to populate `location_names`.
- Apply same joint locations rendering logic for drawer list.

---

### Task 7: End-to-End Verification

**Step 1: Rebuild and Restart Application**
Run command: `docker compose up -d --build open_notebook` to build and restart all services with the new schema and code.

**Step 2: Verify UI Workflows in Browser**
- Navigate to customer page.
- Open "Add Contact" / "Edit Contact" dialog.
- Verify checkbox checklist renders properly, lists only that organization's locations, updates checking/unchecking state smoothly.
- Submit form and verify multiple locations are linked and rendered as a comma-separated list.
- Delete a location, and verify that it is automatically removed from linked contacts' locations list without impacting other linked locations.
