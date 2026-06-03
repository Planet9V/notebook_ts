# OpenAPI API Contracts — Tetrel Notebook

> **Version:** 1.0  
> **Last Updated:** 2026-06-02  
> **Status:** Pending Implementation  
> **Target Framework:** FastAPI (Python 3.11+)  
> **Purpose:** Detailed REST API contracts for Layer 1 (Agent Workflows), Layer 2 (Skills & MCP Servers), and Phase 2 (Customer Organizations). Prepared for direct execution in routers.

---

## 1. OpenAPI 3.0 Specification Map

The API contracts are modeled to integrate directly into FastAPI's native Pydantic parser. 

```
FastAPI Router Mapping:
  [GET]    /api/agents               → List all agent workflows
  [POST]   /api/agents               → Create a new agent workflow
  [GET]    /api/agents/{id}/history  → Fetch execution history logs
  [POST]   /api/agents/{id}/trigger  → Manually execute an agent workflow
  
  [GET]    /api/skills               → List installed skills and configurations
  [PUT]    /api/skills/{name}        → Edit skill configurations in admin UI
  [GET]    /api/mcp                  → List registered MCP servers and tools
  [POST]   /api/mcp                  → Register/connect a new MCP server
  
  [GET]    /api/organizations        → List customer organizations
  [POST]   /api/organizations        → Create customer organization tenant
  [GET]    /api/organizations/{id}/audit → Fetch org-scoped file audit logs
```

---

## 2. Autonomous Agent Endpoints (Layer 1)

### 2.1 Get All Agents
* **URL:** `/api/agents`
* **Method:** `GET`
* **Access:** Admin only
* **Description:** Retrieves all registered autonomous agents.
* **Response `200 OK`:**
```json
[
  {
    "id": "agent_config:social_poster_linkedin",
    "name": "LinkedIn Weekly Insights Poster",
    "description": "Extracts high-value notes from research and posts them to LinkedIn every Thursday.",
    "status": "active",
    "trigger_type": "cron",
    "cron_expression": "0 10 * * 4",
    "steps_count": 3,
    "created_at": "2026-06-02T12:00:00Z"
  }
]
```

### 2.2 Create Agent Workflow
* **URL:** `/api/agents`
* **Method:** `POST`
* **Access:** Admin only
* **Request Body:**
```json
{
  "name": "LinkedIn Weekly Insights Poster",
  "description": "Extracts high-value notes from research and posts them to LinkedIn every Thursday.",
  "status": "active",
  "trigger_type": "cron",
  "cron_expression": "0 10 * * 4",
  "steps": [
    {
      "step_number": 1,
      "name": "Drafting Post from Notes",
      "prompt": "Create a professional LinkedIn post summarizing the key insights from our latest sector research in Dutch.",
      "provider": "openrouter",
      "model": "anthropic/claude-3.5-sonnet",
      "skills": ["social-post-writer-seo"],
      "temperature": 0.3
    },
    {
      "step_number": 2,
      "name": "Publishing post to LinkedIn",
      "prompt": "Publish the drafted text to the company's official LinkedIn profile.",
      "provider": "openrouter",
      "model": "google/gemini-pro",
      "skills": ["linkedin-automation"],
      "temperature": 0.1
    }
  ]
}
```
* **Response `201 Created`:**
```json
{
  "id": "agent_config:social_poster_linkedin",
  "success": true,
  "message": "Agent workflow successfully registered."
}
```

### 2.3 Fetch Agent History Logs
* **URL:** `/api/agents/{id}/history`
* **Method:** `GET`
* **Access:** Admin only
* **Query Parameters:** `limit` (default: 50), `offset` (default: 0)
* **Response `200 OK`:**
```json
{
  "agent_id": "agent_config:social_poster_linkedin",
  "executions": [
    {
      "execution_id": "agent_execution:run_1",
      "started_at": "2026-06-02T10:00:00Z",
      "completed_at": "2026-06-02T10:00:45Z",
      "status": "completed",
      "duration_ms": 45000,
      "cost_estimate": 0.045,
      "logs": [
        {
          "step_number": 1,
          "step_name": "Drafting Post from Notes",
          "type": "skill_call",
          "message": "Executing skill 'social-post-writer-seo'",
          "timestamp": "2026-06-02T10:00:05Z"
        },
        {
          "step_number": 1,
          "step_name": "Drafting Post from Notes",
          "type": "model_output",
          "message": "Model generated draft successfully",
          "payload": {
            "draft": "Innovatie stopt nooit. Onze nieuwste cybersecurity SOW toont..."
          },
          "timestamp": "2026-06-02T10:00:25Z"
        }
      ]
    }
  ]
}
```

### 2.4 Manually Trigger Agent Workflow
* **URL:** `/api/agents/{id}/trigger`
* **Method:** `POST`
* **Access:** Admin only
* **Response `202 Accepted`:**
```json
{
  "execution_id": "agent_execution:run_manual_102",
  "status": "running",
  "message": "Agent execution job successfully queued."
}
```

---

## 3. Skills & MCP Connection Endpoints (Layer 2)

### 3.1 Get All Registered Skills
* **URL:** `/api/skills`
* **Method:** `GET`
* **Access:** Admin only
* **Response `200 OK`:**
```json
[
  {
    "name": "linkedin-automation",
    "description": "Post, schedule, and collect analytics directly on LinkedIn.",
    "category": "Social Media",
    "path": "/skills/linkedin-automation/",
    "enabled": true,
    "config_variables": {
      "LINKEDIN_CLIENT_ID": "encrypted_string_here",
      "LINKEDIN_CLIENT_SECRET": "encrypted_string_here"
    },
    "success_rate": 98.4
  }
]
```

### 3.2 Update Skill Settings
* **URL:** `/api/skills/{name}`
* **Method:** `PUT`
* **Access:** Admin only
* **Request Body:**
```json
{
  "enabled": true,
  "config_values": {
    "LINKEDIN_CLIENT_ID": "new_client_id_here",
    "LINKEDIN_CLIENT_SECRET": "new_client_secret_here"
  }
}
```
* **Response `200 OK`:**
```json
{
  "name": "linkedin-automation",
  "success": true,
  "message": "Skill configuration successfully saved."
}
```

### 3.3 List Connected MCP Servers
* **URL:** `/api/mcp`
* **Method:** `GET`
* **Access:** Admin only
* **Response `200 OK`:**
```json
[
  {
    "name": "chrome-devtools",
    "type": "stdio",
    "status": "connected",
    "tools": [
      {
        "name": "navigate_page",
        "description": "Navigates a headless browser page to the specified URL."
      },
      {
        "name": "take_screenshot",
        "description": "Captures visual mockup render of the active page."
      }
    ],
    "last_pulse": "2026-06-02T14:10:00Z"
  }
]
```

---

## 4. Multi-Tenant Organizations Endpoints (Phase 2)

### 4.1 Get Customer Organizations List
* **URL:** `/api/organizations`
* **Method:** `GET`
* **Access:** Admin only
* **Response `200 OK`:**
```json
[
  {
    "id": "organization:customer_a",
    "name": "Customer Organization A",
    "type": "customer",
    "status": "active",
    "users_count": 12,
    "notebooks_count": 4,
    "created_at": "2026-06-01T08:00:00Z"
  }
]
```

### 4.2 Create Scoped Tenant Organization
* **URL:** `/api/organizations`
* **Method:** `POST`
* **Access:** Admin only
* **Request Body:**
```json
{
  "name": "Customer Organization C",
  "type": "customer"
}
```
* **Response `201 Created`:**
```json
{
  "id": "organization:customer_c",
  "success": true,
  "message": "Organization tenant created successfully. Sandboxed storage initialized."
}
```

### 4.3 Get Scoped File Audit Log
* **URL:** `/api/organizations/{id}/audit`
* **Method:** `GET`
* **Access:** Admin only
* **Query Parameters:** `limit` (default: 100)
* **Response `200 OK`:**
```json
{
  "organization": "organization:customer_a",
  "logs": [
    {
      "timestamp": "2026-06-02T09:12:00Z",
      "user": "user:john_doe",
      "action": "download",
      "target_type": "report",
      "target_id": "source:cset_compliance_iso_27001",
      "file_path": "/data/organizations/org_customer_a/SOWs/ISO27001_Final_Report.pdf",
      "ip_address": "192.168.1.45"
    }
  ]
}
```
