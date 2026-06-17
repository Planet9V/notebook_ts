# Specification: Dynamic Card Categories, Graph Tagging, & Multi-View Relations Graph

## Goal
Enable custom business units (Sales, Research, Project Delivery, and Marketing) to define specific card categories, apply templates, persistently drag and drop canvas elements, and visually relate nodes on dedicated graph canvases.

---

## Technical Specification

### 1. Database Schema (SurrealDB)
To keep Note schemas simple and standard while supporting dynamic coordinate layouts and global tags, we will add three tables:

#### Global Tags Table (`tag`)
Stores unique global tag definitions managed in the admin panel.
```sql
DEFINE TABLE tag SCHEMAFULL;
DEFINE FIELD name ON TABLE tag TYPE string;
DEFINE FIELD category_type ON TABLE tag TYPE option<string>; -- e.g., 'sales', 'research', 'delivery', 'marketing'
DEFINE INDEX tag_name_idx ON TABLE tag COLUMNS name UNIQUE;
```

#### Note-Tag Relation (`note_tag`)
Links Note records to Tag records in a graph structure.
```sql
DEFINE TABLE note_tag SCHEMAFULL;
DEFINE FIELD in ON TABLE note_tag TYPE record<note>;
DEFINE FIELD out ON TABLE note_tag TYPE record<tag>;
DEFINE INDEX unique_note_tag ON TABLE note_tag COLUMNS in, out UNIQUE;
```

#### Node Coordinate Layout Table (`node_layout`)
Stores coordinates for visual elements to persist layout positioning.
```sql
DEFINE TABLE node_layout SCHEMAFULL;
DEFINE FIELD node_id ON TABLE node_layout TYPE string; -- e.g., 'note:123', 'campaign:456'
DEFINE FIELD x ON TABLE node_layout TYPE float;
DEFINE FIELD y ON TABLE node_layout TYPE float;
DEFINE FIELD view_type ON TABLE node_layout TYPE string; -- e.g., 'sales', 'marketing', 'delivery', 'research'
DEFINE INDEX node_view_idx ON TABLE node_layout COLUMNS node_id, view_type UNIQUE;
```

---

### 2. Editor UI & Template Selector
- **Template Dropdown**: A dropdown selection button is added to the Tiptap WYSIWYG note editor toolbar.
- **Templates**: Selecting a template appends a pre-configured Markdown block to the end of the note content:
  - **Sales Service**:
    ```markdown
    ### Service Definition
    - **Price**: $0.00
    - **Market Segment**: 
    - **Sales Executive**: 
    ```
  - **Marketing Campaign**:
    ```markdown
    ### Campaign Plan
    - **Target Audience**: 
    - **Budget**: $0.00
    - **Channels**: 
    ```
  - **Project Delivery Scope**:
    ```markdown
    ### Scope & Compliance
    - **Division**: 
    - **Framework**: NIST CSF v2
    - **SRE Owner**: 
    ```
  - **Research Finding**:
    ```markdown
    ### Audit Finding
    - **ICS Protocol**: Modbus
    - **Threat Level**: 
    - **CVE Reference**: 
    ```

---

### 3. Visual Relations Canvas Updates
The visual relations canvas (`RelationsGraph.tsx`) will be expanded:
- **Node Icon Mapping**: The React Flow nodes check note tags. Notes linked to `tag:service` display a Briefcase icon, and notes linked to `tag:campaign` display a Megaphone icon.
- **Drag-and-Drop Coordinate Persistence**:
  - Dragging a node triggers a coordinate update query (`UPSERT node_layout SET x = $x, y = $y WHERE node_id = $node_id AND view_type = $view_type`).
  - Loading the canvas queries `node_layout` to position nodes, falling back to radial coordinates for unpositioned elements.
- **View Filters**: A selector in the toolbar switches layout states:
  - **Sales View**: Filters canvas to show Deals/Projects, pitched Services, and Customers.
  - **Project Delivery View**: Filters canvas to show Facilities, compliance Tasks, and Audit Notes.
  - **Research View**: Filters canvas to show Notes, reference Sources, and Technical Tags.
  - **Marketing View**: Filters canvas to show parent Campaigns, active Channels, and ad drafts.
- **Interactive Links**: Dragging a connection line between handles creates a persistent relation edge in `entity_link`.

---

## Decision Log
- **2026-06-17**: Decided to use graph relations (`note_tag` edge) to assign tags to notes, enabling global tag name modification in the admin panel to cascade immediately.
- **2026-06-17**: Decided to store coordinates in a dedicated `node_layout` table, avoiding direct column schema additions on core entities to maintain clean records.
- **2026-06-17**: Decided to use a Template Selection Modal in Tiptap to append markdown tables/lists to the note body.

---

## Key Risks & Mitigations
- **Risk**: Concurrent layout editing by multiple users leading to coordinate overwrite lag.
- **Mitigation**: Debounce coordinate updates on the drag-end event by 500ms and use local state coordinates during active dragging.
- **Risk**: Canvas visual clutter from too many nodes.
- **Mitigation**: Introduce role-based filter toggles so users only see nodes relevant to their active tasks.
