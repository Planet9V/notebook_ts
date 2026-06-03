# Sub-Plan: Phase 1 — CSET Full Integration & OT Drawing Canvas

This sub-plan establishes the hyper-detailed technical approach, database schemas, NetworkX validation algorithms, React Flow visual styling, and verification steps for **Phase 1: CSET Full Integration**. We strictly adhere to **Karpathy Rules** (no stubs, zero mock values, absolute production-ready logic) and enforce strict type/compiler validation.

---

## 📐 Overall System Topology

```mermaid
flowchart TB
    subgraph Client [Next.js React Client (Port 8502)]
        CANVAS[OT Network Canvas<br/>@xyflow/react]
        WIZARD[CSET Maturity Wizard<br/>MaturityWizard.tsx]
        TOPOLOGY[Topological Feedback Loop]
    end

    subgraph Backend [FastAPI Application (Port 5055)]
        PARSER[CSET SQL Seed Parser<br/>scratch/cset_parser.py]
        ROUTER[Assessments Router<br/>api/routers/assessments.py]
        NX_VAL[NetworkX Validation Engine<br/>api/routers/notebooks.py]
    end

    subgraph Datastore [SurrealDB Database (Port 8000)]
        DB_REG[regulation table]
        DB_Q[question table]
        DB_A[assessment table]
        DB_S[assessment_session table]
        DB_ANS[assessment_answer table]
    end

    PARSER -->|Seed SQL Extract| DB_REG & DB_Q
    CANVAS -->|Serialize graph JSON| NX_VAL
    NX_VAL -->|Verify boundary rules via NetworkX| TOPOLOGY
    NX_VAL -->|Auto-mark compliance nodes| DB_ANS
    WIZARD -->|Autosave compliance answers| ROUTER
    ROUTER -->|Fetch/Store states| Datastore
```

---

## 💾 1. Database Schemas & CSET Ingestion

CSET frameworks, question indices, and reference guidance are seeded directly into SurrealDB. This avoids heavy external Microsoft SQL Server/IIS Docker overhead by loading CSET's compliance metadata natively inside our high-performance datastore.

### 1.1 Table Schema Specifications

```surrealql
-- Framework Regulation Table
DEFINE TABLE regulation SCHEMAFULL;
DEFINE FIELD name ON regulation TYPE string;
DEFINE FIELD category ON regulation TYPE string;
DEFINE FIELD description ON regulation TYPE string;
DEFINE FIELD created ON regulation TYPE datetime DEFAULT time::now();

-- Regulation Control Question Table
DEFINE TABLE question SCHEMAFULL;
DEFINE FIELD regulation_id ON question TYPE record<regulation>;
DEFINE FIELD standard_code ON question TYPE string;
DEFINE FIELD question_text ON question TYPE string;
DEFINE FIELD description ON question TYPE string;
DEFINE FIELD purdue_level ON question TYPE int DEFAULT 0;
DEFINE FIELD category ON question TYPE string;
DEFINE FIELD created ON question TYPE datetime DEFAULT time::now();

-- Assessment Links Table
DEFINE TABLE assessment SCHEMAFULL;
DEFINE FIELD customer_id ON assessment TYPE record<customer>;
DEFINE FIELD framework_id ON assessment TYPE record<regulation>;
DEFINE FIELD created_at ON assessment TYPE datetime DEFAULT time::now();

-- Assessment Session Milestone Table
DEFINE TABLE assessment_session SCHEMAFULL;
DEFINE FIELD assessment_id ON assessment_session TYPE record<assessment>;
DEFINE FIELD session_name ON assessment_session TYPE string;
DEFINE FIELD status ON assessment_session TYPE string ASSERT $value IN ["IN_PROGRESS", "COMPLETED"];
DEFINE FIELD version_lock ON assessment_session TYPE record<regulation>;
DEFINE FIELD created_at ON assessment_session TYPE datetime DEFAULT time::now();
DEFINE FIELD completed_at ON assessment_session TYPE any; -- datetime or null

-- Assessment Answer Persistent Table
DEFINE TABLE assessment_answer SCHEMAFULL;
DEFINE FIELD session_id ON assessment_answer TYPE record<assessment_session>;
DEFINE FIELD question_id ON assessment_answer TYPE record<question>;
DEFINE FIELD answer ON assessment_answer TYPE string ASSERT $value IN ["Y", "N", "NA", "ALT", "U"];
DEFINE FIELD comments ON assessment_answer TYPE string DEFAULT "";
DEFINE FIELD evidence_url ON assessment_answer TYPE string DEFAULT "";
DEFINE FIELD updated_at ON assessment_answer TYPE datetime DEFAULT time::now() VALUE time::now();
```

### 1.2 Task P1.1: CSET Seed Parser (`scratch/cset_parser.py`)
*   **Goal:** Write a robust, self-healing parser to ingest complete, clean CSET framework metadata from offline documents or text seeds directly into SurrealDB's `regulation` and `question` tables.
*   **Implementation Steps:**
    1. Scan `/Users/jimmcknney/notebook_tetrel/docs/blueprints/` for all 66 `.md` compliance records.
    2. Extract framework overview headers (`Framework ID`, `Category`, `Description`) using precise Python regex to populate the `regulation` record.
    3. Loop through the **Control Matrix** table rows, extracting:
        *   `Standard Code` (e.g. `CMMC_L1-CMMC-AC.L1-3.1.1`)
        *   `Question Text`
        *   `Category` (e.g. `Access Control`)
        *   `Purdue Level` (extract integer `1`, `2`, `3`, `4`, or `5`)
        *   `Guidance / Description` (covers SOP steps, verification criteria, and OT/IT convergence risk).
    4. Save each parsed entry cleanly into SurrealDB under `question` linked to its parent `regulation` record.
*   **No Placeholders:** All descriptions, guidance items, and risk details are extracted fully without truncation.

---

## 📈 2. Backend Graph Validation Engine (`NetworkX`)

The validation engine performs automated topology analysis on a directed network topology graph. The system audits connectivity between Purdue model layers and verifies that firewalls mediate Level 4 (Enterprise) to Level 1-2 (Field Controllers) links.

### 2.1 The Validation Algorithm (`api/routers/notebooks.py`)

When the React Flow front-end serializes the graph JSON, it triggers a `POST` request to `/api/graph/validate`. The backend handles this synchronously with absolute precision:

```python
import networkx as nx
from typing import List, Dict, Any
from pydantic import BaseModel

class GraphNode(BaseModel):
    id: str
    type: str
    purdueLevel: int

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str

class GraphPayload(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

def perform_network_audit(payload: GraphPayload) -> Dict[str, Any]:
    # 1. Construct networkx DiGraph
    G = nx.DiGraph()
    
    # Track node properties for quick retrieval
    node_types = {}
    node_levels = {}
    for node in payload.nodes:
        G.add_node(node.id, type=node.type, level=node.purdueLevel)
        node_types[node.id] = node.type
        node_levels[node.id] = node.purdueLevel
        
    for edge in payload.edges:
        G.add_edge(edge.source, edge.target)
        # Add reverse edge to represent bidirectional flow if needed, 
        # but DiGraph allows modeling exact route control.
        G.add_edge(edge.target, edge.source)

    violations = []
    threat_vectors = []
    
    # 2. Audit Direct Purdue Zone Bypasses (direct link between Level 1/2 and Level 4/5)
    for u, v in G.edges():
        level_u = node_levels.get(u, 0)
        level_v = node_levels.get(v, 0)
        
        # Threat Condition: Direct bypass crossing critical zones without a firewall
        if (level_u <= 2 and level_v >= 4) or (level_u >= 4 and level_v <= 2):
            if node_types.get(u) != "firewall" and node_types.get(v) != "firewall":
                violations.append({
                    "id": f"violation-bypass-{u}-{v}",
                    "type": "direct_bypass",
                    "source": u,
                    "target": v,
                    "description": f"Critical security boundary breach: Direct connection found between Level {level_u} node '{u}' and Level {level_v} node '{v}' without intervening Firewall isolation."
                })

    # 3. Audit Path-Based Firewall Mediation (Purdue Boundary Enforcement)
    # Find all Level 1/2 nodes and Level 4/5 nodes
    field_nodes = [n for n, attr in G.nodes(data=True) if attr.get("level", 0) <= 2]
    enterprise_nodes = [n for n, attr in G.nodes(data=True) if attr.get("level", 0) >= 4]

    for start in field_nodes:
        for end in enterprise_nodes:
            # Check all simple paths to find any route lacking a mediating firewall
            if nx.has_path(G, start, end):
                paths = list(nx.all_simple_paths(G, start, end))
                for path in paths:
                    # Check if any node on the path is a firewall
                    has_firewall = any(node_types.get(node) == "firewall" for node in path)
                    if not has_firewall:
                        threat_vectors.append({
                            "path": path,
                            "description": f"Boundary breach: Direct unmediated path found traversing {path} from Field Zone to Enterprise domain without traversing an active Firewall node."
                        })
                        
                        # Add connection edges of this path to violations to highlight them
                        for i in range(len(path) - 1):
                            violations.append({
                                "id": f"violation-path-{path[i]}-{path[i+1]}",
                                "type": "unmediated_path",
                                "source": path[i],
                                "target": path[i+1],
                                "description": "Connection edge is part of a critical unmediated threat path between OT Field zone and corporate Enterprise LAN."
                            })

    return {
        "status": "fail" if (violations or threat_vectors) else "pass",
        "violations": violations,
        "threat_vectors": threat_vectors
    }
```

### 2.2 Task P1.2: Interactive Graph Validation REST Router (`api/routers/notebooks.py`)
*   **Goal:** Integrate the NetworkX validation algorithm directly into FastAPI routing.
*   **Details:**
    *   Add `POST /api/graph/validate` in `notebooks.py`.
    *   Parse the dynamic node/edge JSON payload, perform audits, and return direct boundary violations and full path threat vectors.
    *   **Auto-Marking Compliance Checklist:** If the graph validation passes with a "clean" status, automatically fetch the customer's active CSET session and auto-update boundary protection controls (e.g. standard code `CMMC_L1-CMMC-AC.L1-3.1.2` - authorization and monitoring of external connections) as `Y` (Yes) with dynamic comments: *"Verified automatically via clean NetworkX topological audit."*

---

## 🎨 3. Frontend Interactive CSET Network Canvas

The client-side drawing canvas is integrated as a tab within the **B2BDraftingWorkspace** 3-panel system, giving writers and engineers a dynamic, visual OT-security editor.

### 3.1 visual Design & Styles
*   **Purdue Model Swimlanes:** The drawing grid is subdivided vertically or horizontally into clean, translucent bands representing the zones of the Purdue Model:
    *   **Level 4-5 (Enterprise):** `#f8fafc` background (light slate/gray) with clear boundary boundaries.
    *   **Level 3.5 (Demilitarized Zone):** `#fef08a` background (soft warning yellow).
    *   **Level 3 (Operations Control):** `#eff6ff` background (soft blue tint).
    *   **Level 1-2 (Process & Field Zone):** `#ecfdf5` background (soft emerald/green).
*   **Floating Asset Toolbox:** An overlay tray on the side containing draggable OT assets:
    *   `firewall` (CSET standard firewall SVG)
    *   `plc` (Siemens field controller node SVG)
    *   `switch` (Cisco Industrial Switch SVG)
    *   `hmi` (Human-Machine Interface workstation SVG)
    *   `historian` (Process data logging host SVG)
    *   `rtu` (Remote Terminal Unit node SVG)
*   **Manhattan Snapping & ELKjs Auto-Layout:** 
    *   Connections utilize custom orthogonal routing paths to enforce clean 90-degree right angles.
    *   `elkjs` arranges the network nodes automatically when the user clicks the "Auto-Format Topology" button to prevent overlap.
*   **Pulsating Threat Highlights:**
    *   Nodes or connection edges flagged by `/api/graph/validate` as violating boundaries are rendered with custom React Flow styles: `stroke: #ef4444` (bright warning red) with a pulsating SVG halo (`stroke-dasharray: 5`, `animation: pulse`).

---

## 🧪 4. Step-by-Step Execution Checklist

We translate the above specifications into a sequence of atomic, verified task steps.

### Phase A: Core Ingestion (Task 1)
- [ ] **Step A1: Implement MS SQL CSET Seed Parser (`scratch/cset_parser.py`)**
  *   Write the Python script traversing markdown records under `/docs/blueprints/`.
  *   Parse tables, standard codes, Purdue levels, and guidance texts via regular expressions.
  *   Execute direct database inserts into SurrealDB.
- [ ] **Step A2: Run Parse Script and Audit Datastore Population**
  *   Run the script inside the development environment.
  *   Query SurrealDB table counts: `SELECT count() FROM regulation` and `SELECT count() FROM question`.
  *   *Verify*: Assert that exactly 66 frameworks and all 1,500+ controls are persisted inside SurrealDB.

### Phase B: Backend Graph Validation Router (Task 2)
- [ ] **Step B1: Create Pytest Topology Suite (`tests/test_graph_validation.py`)**
  *   Write failing test cases for a direct Level 1 ↔ Level 4 bypass (no firewall).
  *   Write failing test cases for a multihop path from Level 1 to Level 4 bypassing the DMZ firewall.
  *   Write passing test cases for a mediated and segmented topology.
- [ ] **Step B2: Implement `POST /api/graph/validate` Endpoint**
  *   Import `networkx` inside `api/routers/notebooks.py`.
  *   Write the `GraphNode`, `GraphEdge`, and validation router endpoints.
  *   Run Pytest to confirm all test cases compile and pass 100% green.

### Phase C: React Flow Drawing Canvas Integration (Task 3)
- [ ] **Step C1: Install React Flow & ELKjs**
  *   Run `npm install @xyflow/react elkjs` under the `frontend` folder.
  *   Confirm that there are zero TypeScript compiler warnings or dependencies conflicts.
- [ ] **Step C2: Build Custom Nodes & Orthogonal Routing**
  *   Write custom device node components utilizing static SVGs.
  *   Implement orthogonal right-angle edge paths in the React Flow viewport.
- [ ] **Step C3: Create Visual Purdue Swimlanes Grid**
  *   Implement the horizontal background bands dividing the canvas viewport by Purdue level.
- [ ] **Step C4: Wire Real-Time Auditing Hook**
  *   Add a React state watcher triggering an optimistic `POST /api/graph/validate` call on any graph state change.
  *   Apply pulsating red highlight styles to boundary-breached nodes and edges.
  *   Sync the compliance status checklist instantly on validation updates.

### Phase D: Multi-Tenant Customer Alignment & Security Verification (Task 4)
- [ ] **Step D1: Restrict Assessment Access by Organization**
  *   Assert that customers can only query and edit assessments associated with their unique `customer_id`.
- [ ] **Step D2: Complete Integration & E2E Verification**
  *   Run complete backend and frontend builds to guarantee 100% type safety.
  *   Formally compile final progress and walkthrough summaries.
