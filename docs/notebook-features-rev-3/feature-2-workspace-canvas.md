# Rev 3 Feature 2: Unified Workspace Split-Pane Canvas

*Document Status: Draft Spec (June 8, 2026)*

---

## 1. Overview

The **Unified Workspace Split-Pane Canvas** eliminates the constant jumping between `/notebooks` (canvas), `/search` (lookups), and `/compliance` (quizzes) by combining them into a single, cohesive project workspace.

```
┌───────────────────────────────────────┬──────────────────────────────────┐
│             Left Pane: Research       │     Right Pane: Document Editor  │
├───────────────────────────────────────┼──────────────────────────────────┤
│  [ Search ] [ Quiz ] [ Canvas ]       │  # Statement of Work (SOW)       │
│                                       │                                  │
│  🔍 Query: "rare earth mining 2026"  │  Acme Corp is evaluating site    │
│  - Document 1: 89% Cosine Similarity  │  security compliance.            │
│  - Document 2: 78% Cosine Similarity  │  This proposal is supported by   │
│                                       │  historical regulations[1].      │
│  ───────────────────────────────────  │                                  │
│  [Drag Result to Editor]             │  [1] Source: PubMed #10052       │
└───────────────────────────────────────┴──────────────────────────────────┘
```

---

## 2. Split-Pane Workspace Structure

When a user opens an active Project or Customer record, they are presented with a split-pane layout:

### 2.1 Left Pane: The Research & Context Hub
*   **API Search Portal:** Quick access to Brav/Valyu search query forms and local pgvector results.
*   **Compliance Quiz Panel:** Interactive CSET checklist questions. Answering a question updates the facility's security posture and project milestones in real-time.
*   **React Flow Node Canvas:** Visual asset workspace mapping out equipment, threats, and data nodes.

### 2.2 Right Pane: The Rich Document Editor
*   **Markdown Writing Console:** A full-height document editor for drafting SOWs, compliance audits, or research publications.
*   **StyleGuide Integration:** Renders a print-ready compilation layout based on the organization's custom typography (font family, margins, brand color schemes).

---

## 3. Drag-and-Drop Citation Pipeline

The primary UX highlight of this module is the **drag-and-drop citation pipeline**:

1.  The user runs a search query in the Left Pane.
2.  The pgvector search retrieves relevant document blocks.
3.  The user drags a search result card from the Left Pane and drops it into the Right Pane document editor.
4.  The editor:
    *   Inserts the quoted content at the drop cursor.
    *   Generates an inline numeric citation (e.g. `[1]`).
    *   Appends a footnote at the bottom of the document linking to the source's unique database ID, author, date, and relevance score.
    *   Saves the citation relation link in SurrealDB (`note->cites->source`).

This mechanism guarantees complete trace-citation provenance for engineering-level reports.
