# API Reference — Tetrel Notebook

> **Version:** 2.0  
> **Last Updated:** 2026-06-02  
> **Backend Base URL:** `http://localhost:5055/api` (Development default)  
> **Target Audience:** Developers, Integrators, and Autonomous Coding Agents  
> **Protocol Support:** REST (JSON), Server-Sent Events (SSE), WebRTC (LiveKit)

---

## 1. Getting Started & Authentication

All API operations require a Bearer token or authorization header in development (aligned to [ADR-009: Development Mode Auth](../DECISIONS.md#adr-009-development-mode-auth)).

### Development Authentication Header
Include the `X-Password` header or a standard Bearer authorization header:

```bash
Authorization: Bearer your_open_notebook_password
```

---

## 2. Purdue Security & Compliance API (Phase 1 / D4)

### 2.1 Validate Purdue Zone Topology
Performs a Purdue Model Zone boundary security audit. Ensures firewall-mediated separation between process control (Level 1–2) and enterprise networks (Level 4), identifies IP duplication conflicts, and subnet boundary crossings.

* **Endpoint:** `POST /api/graph/validate`
* **Authentication:** Required
* **Request Body (`GraphValidationRequest`):**
```json
{
  "nodes": [
    {
      "id": "node_plc_1",
      "name": "Safety PLC",
      "type": "plc",
      "purdueLevel": 1,
      "ip_address": "192.168.1.10",
      "mac_address": "00:0a:95:9d:68:16",
      "subnet_mask": "255.255.255.0",
      "hostname": "plc-safety-01"
    },
    {
      "id": "node_firewall_1",
      "name": "Zone Firewall",
      "type": "firewall",
      "purdueLevel": 3,
      "ip_address": "192.168.1.1",
      "mac_address": "00:0a:95:9d:68:17",
      "subnet_mask": "255.255.255.0",
      "hostname": "fw-zone-01"
    },
    {
      "id": "node_workstation_1",
      "name": "Enterprise Workstation",
      "type": "workstation",
      "purdueLevel": 4,
      "ip_address": "10.0.0.15",
      "mac_address": "00:0a:95:9d:68:18",
      "subnet_mask": "255.255.255.0",
      "hostname": "workstation-ent-01"
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_plc_1",
      "target": "node_workstation_1"
    }
  ]
}
```

* **Response Body (`GraphValidationResponse` - 200 OK):**
```json
{
  "violatedNodes": ["node_plc_1", "node_workstation_1"],
  "violatedEdges": ["edge_1"],
  "threatPaths": [
    ["node_plc_1", "node_workstation_1"]
  ],
  "verifiedRequirements": [],
  "nodeViolations": {
    "node_plc_1": [
      "Direct Zone Bypass: Connected directly to Level 4 device without a firewall.",
      "Unmediated Path: Critical communication route to enterprise operations bypasses all firewalls."
    ],
    "node_workstation_1": [
      "Direct Zone Bypass: Connected directly to Level 1 device without a firewall.",
      "Unmediated Path: Critical communication route to enterprise operations bypasses all firewalls."
    ]
  },
  "edgeViolations": {
    "edge_1": [
      "Direct Zone Bypass: Direct crossing of Purdue levels without firewall mediation.",
      "Unmediated communication route crossing security zones."
    ]
  }
}
```

* **Example Request (cURL):**
```bash
curl -X POST http://localhost:5055/api/graph/validate \
  -H "Authorization: Bearer test_password" \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "n1", "name": "PLC", "type": "plc", "purdueLevel": 1, "ip_address": "192.168.1.10"},
      {"id": "n2", "name": "PC", "type": "workstation", "purdueLevel": 4, "ip_address": "10.0.0.10"}
    ],
    "edges": [
      {"id": "e1", "source": "n1", "target": "n2"}
    ]
  }'
```

---

## 3. Search & Hybrid RAG Engine (Layer 3 / D6, D11)

### 3.1 Perform Semantic Search
Executes full-text keyword or semantic vector search across local sources/notes, optionally augmented with Valyu hybrid indexes and LLM-based reranking.

* **Endpoint:** `POST /api/search`
* **Authentication:** Required
* **Request Body (`SearchRequest`):**
```json
{
  "query": "cryptographic diode hardware isolation",
  "type": "hybrid",
  "limit": 10,
  "minimum_score": 0.3,
  "search_sources": true,
  "search_notes": false,
  "reranker": true
}
```

* **Response Body (`SearchResponse` - 200 OK):**
```json
{
  "results": [
    {
      "id": "source:cset_framework_iec_62443",
      "title": "IEC 62443 Boundary Controls",
      "content": "SR 5.4 outlines the requirements for unidirectional cryptographic hardware diodes to achieve absolute physical zone boundary isolation...",
      "url": "https://cisa.gov/cset",
      "relevance": 0.94,
      "score": 0.94,
      "source_origin": "Local KB"
    },
    {
      "id": "valyu:source_102",
      "title": "Valyu Diode Specifications",
      "content": "Optical isolators and hardware diodes ensure read-only electrical signals across Level 2 process networks...",
      "url": "https://valyu.ai/specs",
      "relevance": 0.81,
      "score": 0.81,
      "source_origin": "Valyu"
    }
  ],
  "total_count": 2,
  "search_type": "hybrid"
}
```

### 3.2 Interactive Ask Engine (LangGraph Streaming)
Streams multi-agent search strategy formulation, raw extraction hits, and final compiled synthesis as Server-Sent Events (SSE).

* **Endpoint:** `POST /api/ask`
* **Authentication:** Required
* **Request Body (`AskRequest`):**
```json
{
  "question": "Explain Purdue Level 2 boundary isolation guidelines."
}
```
* **Response Body (Streaming - `text/event-stream`):**
```
data: {"type": "strategy", "reasoning": "Formulating search terms for Purdue Level 2 boundary isolation...", "searches": [{"term": "Purdue Level 2 boundary isolation", "instructions": "Search local documents"}]}

data: {"type": "answer", "content": "According to the IEC 62443 standard, Level 2 (Local Supervisory) represents control zones where HMIs reside..."}

data: {"type": "final_answer", "content": "### Purdue Level 2 Boundary Summary\nBoundary isolation between Level 2 and Level 3 networks requires dedicated firewall rules..."}
```

---

## 4. Pipeline CRM & Notebooks API

### 4.1 Create Notebook (Pipeline Card)
Creates a new notebook container, which functions as a card in the Sales Pipeline Kanban board.

* **Endpoint:** `POST /api/notebooks`
* **Authentication:** Required
* **Request Body (`NotebookCreate`):**
```json
{
  "name": "Water Treatment Plant Audit Plan",
  "description": "Compliance assessment for public utilities sector.",
  "stage": "proposal",
  "client_name": "Municipal Utilities Group",
  "estimated_value": 45000.0,
  "prospect_website": "https://municipalwater.org",
  "contacts": [
    {
      "name": "Willem de Vries",
      "email": "w.devries@municipalwater.org",
      "phone": "+31 6 12345678"
    }
  ],
  "customer_id": "organization:customer_a"
}
```

* **Response Body (`NotebookResponse` - 201 Created):**
```json
{
  "id": "notebook:water_treatment_audit",
  "name": "Water Treatment Plant Audit Plan",
  "description": "Compliance assessment for public utilities sector.",
  "archived": false,
  "created": "2026-06-02T14:30:00Z",
  "updated": "2026-06-02T14:30:00Z",
  "source_count": 0,
  "note_count": 0,
  "stage": "proposal",
  "client_name": "Municipal Utilities Group",
  "estimated_value": 45000.0,
  "prospect_website": "https://municipalwater.org",
  "contacts": [
    {
      "name": "Willem de Vries",
      "email": "w.devries@municipalwater.org",
      "phone": "+31 6 12345678"
    }
  ],
  "customer_id": "organization:customer_a"
}
```

---

## 5. Voice & Podcast API (Phase 6 / D8)

### 5.1 Real-Time Voice RAG Interaction
Streams user STT audio segments, performs RAG context searches, processes using default LLM, and responds with synthetic Kokoro audio stream.

* **Endpoint:** `POST /api/voice/rag`
* **Authentication:** Required
* **Headers:** `Content-Type: multipart/form-data`
* **Request Form Fields:**
  * `audio`: File upload (PCM/WAV)
  * `session_id`: Unique chat thread string (Optional)
* **Response Body (Streaming - `audio/wav` + SSE meta):**
```
--audio_boundary
Content-Type: application/json
{
  "citations": [
    {"id": "source:iec_62443", "title": "IEC 62443 Standard Section 4.1"}
  ]
}
--audio_boundary
Content-Type: audio/wav
[RAW AUDIO BYTES]
```

---

## 6. Global Error Structure

Every API error is formatted as a standardized JSON response matching FastAPIs default structure:

```json
{
  "detail": "Descriptive error message indicating boundary condition failure or API quota issues."
}
```

### Common HTTP Status Codes

| Code | Cause | Recommended Action |
|---|---|---|
| **`400 Bad Request`** | Invalid input parameters, SurrealQL syntax error, or subnet configuration issue. | Review request JSON payload schema validation. |
| **`401 Unauthorized`** | Missing or incorrect Bearer token in the request headers. | Set the `OPEN_NOTEBOOK_PASSWORD` environment variable or check configurations. |
| **`404 Not Found`** | Requested Notebook, Source, Note, or Organization record does not exist. | Check database IDs. |
| **`429 Too Many Requests`**| OpenRouter / Perplexity rate limit exceeded. | Switch default LLM models to local Ollama/LMStudio instance. |
| **`500 Server Error`** | Database connection timeout or failure in the Docker containers. | Verify SurrealDB container health. |
