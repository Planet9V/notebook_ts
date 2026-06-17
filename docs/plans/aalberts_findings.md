# Findings: Aalberts Workspace Enhancements

## Note Content Truncation
- **Root Cause**: In `api/routers/notes.py` line 30, the `GET /notes` handler queries:
  ```python
  notes = await notebook.get_notes()
  ```
  Since `include_content` defaults to `False` in the `get_notes` method of `open_notebook/domain/notebook.py`, the returned note database objects contain empty `content` fields.
- **Solution**: Pass `include_content=True` explicitly in the list handler.

## Split-Pane Layout
- **Current Layout**: In `frontend/src/app/(dashboard)/notebooks/[id]/page.tsx`, desktop layout renders either the 3 collapsible columns or the single full-screen Relations Graph:
  ```tsx
  {showRelations ? (
    <RelationsGraph ... />
  ) : (
    <div className="hidden lg:flex gap-6 ...">
      <SourcesColumn ... />
      <NotesColumn ... />
      <ChatColumn ... />
    </div>
  )}
  ```
- **Solution**: Modify the layout so when `showRelations` is true, the UI displays a flex row containing the `NotesColumn` on the left and the `RelationsGraph` on the right.

## AI Suggested Links and LLM Reason Generation
- **Current Prompting Utility**: `api/routers/research_memory.py` uses `provision_langchain_model` to invoke LLM pipelines.
- **Method Signature**:
  ```python
  from open_notebook.ai.provision import provision_langchain_model
  from open_notebook.utils.text_utils import extract_text_content
  ```
- **Concurrency Plan**: Since `get_suggested_links` checks multiple node pairs, we will construct async helper tasks and process them in parallel using `asyncio.gather` with a timeout or fallback logic.
