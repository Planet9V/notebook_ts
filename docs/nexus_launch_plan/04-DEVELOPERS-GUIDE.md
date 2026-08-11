# Enterprise Codebase Nexus — Developer & Skill Guide

> **Document Version:** 2.1.0 (Kaizen Error-Proofed & Poka-Yoke Validated)  
> **Target Audience:** Developers, Designers, Content Creators, Operations Engineers  

---

## 1. Universal MCP Configuration (`.mcp.json`)

Add the following unified `.mcp.json` to your project root to connect all AI tools (Claude Code, Antigravity/Gemini, Cursor, VS Code) to the complete MCP tool suite:

```json
{
  "mcpServers": {
    "enterprise-nexus": {
      "httpUrl": "http://internal-server.domain.local:4747/api/mcp",
      "headers": {
        "Authorization": "Bearer secret_nexus_token_2026"
      },
      "description": "Central Team Codebase Knowledge Graph & Memory Engine"
    },
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://localhost:9222"
      ],
      "description": "Headless & GUI Browser Automation for Web UI & Scrapers"
    },
    "perplexity-ask": {
      "command": "npx",
      "args": [
        "-y",
        "server-perplexity-ask"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      },
      "description": "Real-time Perplexity Web Research API"
    }
  }
}
```

---

## 2. Poka-Yoke (Error-Proofing) Input Validation at System Boundaries

To prevent malformed JSON-RPC payloads from crashing background MCP tool handlers:

### Boundary Validation Schema (Zod Example)
```typescript
import { z } from 'zod';

export const MCPQuerySchema = z.object({
  question: z.string().min(1, "Question cannot be empty").max(1000),
  budget: z.number().int().min(100).max(10000).default(2000),
  graph_path: z.string().optional()
});

export type MCPQuery = z.infer<typeof MCPQuerySchema>;
```

---

## 3. Web & 3D Tech Stack Workflows

### A. Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui
- **Context7 Automatic Reference:** When generating components or API routes, invoke Context7 to verify the latest Next.js App Router syntax (`headers()`, Server Actions, `useActionState`).
- **Tailwind v4 Setup:** Uses CSS-first `@import "tailwindcss";` without legacy `tailwind.config.js`.

### B. Babylon.js 3D Web Rendering
- **Canvas Component:** Render high-performance WebGPU / WebGL 3D scenes in React using `@babylonjs/core` and `@babylonjs/gui`.
- **Use Cases:** Interactive node graph visualizers, product 3D viewports, and digital twin layouts.

### C. Unreal Engine 5 Automation Bridge
- Control Unreal Engine editor and levels via Docker MCP tools:
  - `manage_level` — Create and inspect level structures.
  - `control_actor` — Manipulate 3D actors, lights, and transform matrices.
  - `manage_material_authoring` — Modify PBR materials and shaders.

---

## 4. Social Media & Communication Integrations

### A. Gmail & Google Calendar Integration
- **OAuth-Bypass Token Flow:** Authenticates via local OAuth credentials (`~/.gemini/config/client_secret.json`) and caches refresh tokens.
- **Commands:**
  - `gmail-automation` — Send, search, and draft emails without manual browser login.
  - `outlook-calendar-automation` / `google-calendar-automation` — Schedule and manage meetings.

### B. LinkedIn & X (Twitter) Publishing
- **LinkedIn PDF Carousel:** Generate PDF carousel slides from text using `linkedin-pdf-carousel` skill.
- **X Article Publisher:** Format and publish long-form posts directly to X via `x-article-publisher-skill`.

---

## 5. Karpathy Workflow Enforcement in Daily Coding

Before committing any code, developers must run the TDD & linting verification cycle:

```bash
# 1. Run unit tests (Karpathy P3)
.venv/bin/pytest tests/

# 2. Check TypeScript type-safety (Karpathy P4)
cd frontend && npx tsc --noEmit

# 3. Code formatting & linting
ruff check . --fix

# 4. Refresh Knowledge Graph (Karpathy P7)
graphify update .
```
