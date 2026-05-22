# Interactive CSET Network Canvas with NetworkX

This document outlines the design architecture, visual look, backend validation engine, and container topology for the **OT/ICS Network Drawing Canvas** inside the **Tetrel Notebook** workspace. It provides an independently verifiable, step-by-step checklist to build the parser and interactive editor.

---

## 1. Frontend Architecture & Visual Layout

The network diagram editor integrates directly into the existing **B2BDraftingWorkspace** 3-panel dashboard under a new toggle tab, providing a real-time compliance feedback loop.

```
+------------------+------------------+--------------------------------------+
|  Panel 1 (3 col) |  Panel 2 (4 col) |           Panel 3 (5 col)            |
|                  |                  |                                      |
|  Blueprints      |  B2B Compliance  |  [SOW Editor]   [OT Canvas Tab]      |
|  & parameters    |     Checklist    |  +--------------------------------+  |
|                  |                  |  | Purdue Level 4 (Enterprise)    |  |
|  [Client Name]   |  [x] HS-50 DEMA  |  +--------------------------------+  |
|  [Target Spec]   |  [ ] IEC 62443   |  | Purdue Level 3 (Operations)    |  |
|                  |  [ ] ASIL-D SPFM |  +--------------------------------+  |
|                  |                  |  | Purdue Level 1-2 (Field Zone)  |  |
|                  |                  |  +--------------------------------+  |
+------------------+------------------+--------------------------------------+
```

### Visual Styling & Interactions:
*   **OT Canvas Tab**: Users can switch the right panel between the **Live Markdown Preview** and the **OT Network Canvas**.
*   **Purdue Model Swimlanes**: The canvas (rendered via `@xyflow/react`) is structured into three visually distinct horizontal bands:
    *   **Level 4 / Enterprise Network** (top band - styled with soft slate background).
    *   **Level 3 / Operations Control** (middle band - styled with a subtle blue tint).
    *   **Level 1-2 / Process Control & Field Zone** (bottom band - styled with a subtle emerald tint).
*   **Floating Device Toolbox**: A small floating tray allows users to drag-and-drop OT assets (Firewall, PLC, Switch, HMI, Historian, RTU) onto the grid.
*   **Glassmorphic Nodes**: Nodes render using custom React Flow components featuring high-fidelity CSET SVG vector icons, glowing active state badges, and dynamic connection ports.
*   **Obstacle-Avoiding Right-Angle Routing**: Links connect devices at clean 90-degree right angles. **ELKjs** automatically routes connections around intermediate device nodes to prevent line overlapping.
*   **Pulsating Threat Indicators**: When a connection violates Purdue isolation rules (e.g., connecting a PLC directly to the enterprise network without a firewall), the edge visually pulses in blinking bright orange/red with a warning badge. Clicking the edge opens the specific standard violation details in the middle checklist.

---

## 2. Backend Graph Validation Engine (`NetworkX`)

The backend performs graph security audits on an active `/api/graph/validate` FastAPI endpoint:

1.  **Serialization**: The React Flow client serializes the nodes and edges into a JSON payload:
    ```json
    {
      "nodes": [
        {"id": "plc-01", "type": "plc", "purdueLevel": 1},
        {"id": "fw-01", "type": "firewall", "purdueLevel": 3},
        {"id": "ent-01", "type": "switch", "purdueLevel": 4}
      ],
      "edges": [
        {"id": "e1", "source": "plc-01", "target": "fw-01"},
        {"id": "e2", "source": "fw-01", "target": "ent-01"}
      ]
    }
    ```
2.  **NetworkX Construction**: FastAPI parses the JSON and builds a `networkx.DiGraph`.
3.  **Boundary Isolation Audits**:
    *   **Direct Zone Crossings**: Check all direct edges. If `abs(source.purdueLevel - target.purdueLevel) > 1` and neither node is a mediating `firewall`, it flags a direct zone bypass.
    *   **Firewall Mediation Check**: For every path starting at a Level 1/2 node and ending at a Level 4 node, the engine checks if a `firewall` node exists on the path. If an unmediated path is found, the exact sequence of hops is returned as a threat vector path.
4.  **Relational Database Mapping**: When a secure topology is achieved, the middle compliance checklist automatically marks relevant regulatory standard questions (e.g. *IEC 62443 Section 4.2 Boundary Protection*) as **Verified** and updates the SOW Markdown compilation matrix.

---

## 3. Docker & Deployment Topology (Unified Container)

Tetrel is built on a **two-container operational model** that avoids separate, heavy microservices:

```
                  +----------------------------------------------+
                  |           DOCKER-COMPOSE WORKSPACE           |
                  +----------------------------------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
+------------------------------+                    +------------------------------+
|   Container 1: surrealdb     |                    | Container 2: open_notebook   |
|   (Port 8000)                |                    | (Managed by supervisord)     |
|   Multi-model Graph DB       |                    |                              |
+------------------------------+                    | - Next.js UI Server (8502)   |
                                                    | - FastAPI REST API (5055)    |
                                                    | - RAG Command Worker         |
                                                    +------------------------------+
```

*   **No Separate CSET Container**: CISA CSET's native stack runs on .NET Core and Microsoft SQL Server. Rather than running this heavy overhead, our script parses CSET seed `.sql` files directly as raw text inside Python, importing the frameworks and symbols directly into **SurrealDB**.
*   **No Separate NetworkX Container**: NetworkX is loaded as a lightweight, native pip package directly inside the existing FastAPI virtual environment in the `open_notebook` container.

---

## 4. Implementation Steps & Checklist

- [ ] **Task 1: CSET Seed Parser (`scratch/cset_parser.py`)**
  *   Write a Python parser script that reads MS SQL database seed scripts (frameworks, questions, device names) as raw text.
  *   Extract `INSERT INTO` records via regex patterns and ingest them directly into SurrealDB's `regulation` and `question` collections.
  *   *Verify*: Run `python scratch/cset_parser.py` and query SurrealDB to confirm CSET regulations are fully loaded.

- [ ] **Task 2: Ingest OT Device SVGs**
  *   Copy/extract device vector icons from CSET's Angular asset directories and save them under `frontend/public/assets/devices/`.
  *   *Verify*: Check that the SVGs exist and render correctly in a browser.

- [ ] **Task 3: Install Frontend Drawing Packages**
  *   Install React Flow (`@xyflow/react`), layout engine (`elkjs`), and UI helpers in the `frontend` directory.
  *   *Verify*: Run `npm list @xyflow/react elkjs` and confirm successful installation.

- [ ] **Task 4: Build Custom Nodes & ELKjs Right-Angle Snapping**
  *   Create the Horizontal Purdue Swimlanes background component.
  *   Build the `CustomDeviceNode` component rendering the custom CSET device SVGs.
  *   Implement the custom orthogonal Manhattan edge component utilizing `elkjs` for obstacle-avoiding right-angle paths.
  *   *Verify*: Add a playground page `/notebooks/test-canvas` to manually verify dragging nodes and snapping right-angled connections.

- [ ] **Task 5: FastAPI NetworkX Validation Router**
  *   Write `/api/graph/validate` in `api/routers/notebooks.py`.
  *   Parse graph JSON payloads, build NetworkX `DiGraph` structures, audit zone violations, and return structured threat paths.
  *   *Verify*: Add a pytest script `tests/test_graph_validation.py` asserting proper validation responses on mock topologies.

- [ ] **Task 6: Wire Real-Time Validation Loop**
  *   Add a side-by-side / tab switcher in `B2BDraftingWorkspace.tsx` to display the canvas.
  *   Trigger optimistic POST requests to `/api/graph/validate` on React Flow state changes (`onConnect`, `onEdgesChange`).
  *   Bind edge styles (glowing red warning state) and sync the `B2BComplianceChecklist` based on validation outcomes.
  *   *Verify*: Drag a direct line from Level 1 to Level 4 in the canvas and confirm the line blinks orange/red, the warning badge pops up, and the checklist highlights the violation.

- [ ] **Task 7: Regression & Integration Verification**
  *   Execute full backend pytest suites and Vitest component suites.
  *   *Verify*: Run `.venv/bin/pytest` and `npm run test` ensuring 100% green compliance.

---

## 5. Notes & Constraints
*   **Performance**: React Flow handles canvas viewports natively. All graph pathfinding and complex zone computations are delegated entirely to the Python FastAPI backend using high-performance NetworkX functions, keeping the client interface at a smooth 60fps.
*   **No Placeholders**: Ensure all device nodes render real CSET SVG vectors.

