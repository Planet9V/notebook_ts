# Skills & Integration Inventory

> **Last Updated:** 2026-06-02  
> **Purpose:** Catalog all available skills, MCPs, and libraries for use in Tetrel Notebook  
> **Rule:** Use these FIRST before writing custom code (Principle P2)

---

## Available Skills by Category

### Social Media Integration
| Skill | Path | Use For |
|---|---|---|
| `linkedin-automation` | `/skills/linkedin-automation/` | Post, schedule, collect stats on LinkedIn |
| `linkedin-cli` | `/skills/linkedin-cli/` | CLI-based LinkedIn operations |
| `linkedin-profile-optimizer` | `/skills/linkedin-profile-optimizer/` | Profile optimization |
| `twitter-automation` | `/skills/twitter-automation/` | Post, schedule on Twitter/X |
| `x-article-publisher-skill` | `/skills/x-article-publisher-skill/` | Publish articles to X |
| `x-twitter-scraper` | `/skills/x-twitter-scraper/` | Scrape tweets, replies, stats |
| `social-content` | `/skills/social-content/` | Social content creation |
| `social-orchestrator` | `/skills/social-orchestrator/` | Unified social posting workflow |
| `social-post-writer-seo` | `/skills/social-post-writer-seo/` | SEO-optimized social posts |

### Email & Calendar
| Skill | Path | Use For |
|---|---|---|
| `gmail-automation` | `/skills/gmail-automation/` | Send, draft, schedule via Gmail (SMTP + OAuth) |
| `outlook-automation` | `/skills/outlook-automation/` | Outlook/O365 email |
| `outlook-calendar-automation` | `/skills/outlook-calendar-automation/` | Calendar sync and scheduling |
| `brevo-automation` | `/skills/brevo-automation/` | Email marketing automation |

### Google Workspace
| Skill | Path | Use For |
|---|---|---|
| `google-docs-automation` | `/skills/google-docs-automation/` | Create/edit Google Docs |
| `google-slides-automation` | `/skills/google-slides-automation/` | Create Google Slides |
| `google-sheets-automation` | `/skills/google-sheets-automation/` | Create/edit Google Sheets |

### Document Export
| Skill | Path | Use For |
|---|---|---|
| `pdf-official` | `/skills/pdf-official/` | Professional PDF generation |
| `docx-official` | `/skills/docx-official/` | Word document creation |
| `pptx-official` | `/skills/pptx-official/` | PowerPoint creation |
| `python-pptx-generator` | `/skills/python-pptx-generator/` | Python-based PPTX with images |

### Sales & CRM
| Skill | Path | Use For |
|---|---|---|
| `sales-automator` | `/skills/sales-automator/` | Sales workflow automation |
| `sales-enablement` | `/skills/sales-enablement/` | Sales materials, decks |
| `cold-email` | `/skills/cold-email/` | Cold outreach campaigns |
| `lead-magnets` | `/skills/lead-magnets/` | Lead magnet creation |
| `apify-lead-generation` | `/skills/apify-lead-generation/` | Scrape leads from platforms |

### Research & Search
| Skill | Path | Use For |
|---|---|---|
| `deep-research` | `/skills/deep-research/` | Autonomous multi-step research |
| `search-specialist` | `/skills/search-specialist/` | Advanced search techniques |
| `exa-search` | `/skills/exa-search/` | Exa.ai semantic search |
| `tavily-web` | `/skills/tavily-web/` | Tavily web search |

### Voice & Audio
| Skill | Path | Use For |
|---|---|---|
| `voice-agents` | `/skills/voice-agents/` | Voice agent patterns |
| `podcast-generation` | `/skills/podcast-generation/` | Audio narrative generation |
| `voice-ai-development` | `/skills/voice-ai-development/` | Voice AI patterns |

### Agent Framework
| Skill | Path | Use For |
|---|---|---|
| `autonomous-agents` | `/skills/autonomous-agents/` | Self-running agent patterns |
| `autonomous-agent-patterns` | `/skills/autonomous-agent-patterns/` | Architectural patterns |
| `agent-orchestrator` | `/skills/agent-orchestrator/` | Multi-agent orchestration |
| `agent-orchestration-multi-agent-optimize` | `/skills/agent-orchestration-multi-agent-optimize/` | Optimization |
| `crewai` | `/skills/crewai/` | Multi-agent framework |

### RAG & Embeddings
| Skill | Path | Use For |
|---|---|---|
| `rag-engineer` | `/skills/rag-engineer/` | RAG pipeline design |
| `rag-implementation` | `/skills/rag-implementation/` | RAG implementation |
| `embedding-strategies` | `/skills/embedding-strategies/` | Embedding model selection |

### Security & Compliance
| Skill | Path | Use For |
|---|---|---|
| `security-auditor` | `/skills/security-auditor/` | Security audit |
| `threat-modeling-expert` | `/skills/threat-modeling-expert/` | Threat model design |
| `threat-mitigation-mapping` | `/skills/threat-mitigation-mapping/` | Mitigation strategies |

### Auth & Multi-Tenant
| Skill | Path | Use For |
|---|---|---|
| `auth-implementation-patterns` | `/skills/auth-implementation-patterns/` | Auth patterns |
| `clerk-auth` | `/skills/clerk-auth/` | Clerk-based auth |
| `saas-multi-tenant` | `/skills/saas-multi-tenant/` | Multi-tenant patterns |

### Observability
| Skill | Path | Use For |
|---|---|---|
| `observability-engineer` | `/skills/observability-engineer/` | Monitoring setup |
| `observability-monitoring-monitor-setup` | `/skills/observability-monitoring-monitor-setup/` | Monitor config |
| `docker-expert` | `/skills/docker-expert/` | Docker operations |

### Content & Writing
| Skill | Path | Use For |
|---|---|---|
| `content-creator` | `/skills/content-creator/` | Brand voice, SEO, content |
| `avoid-ai-writing` | `/skills/avoid-ai-writing/` | Remove AI writing patterns |
| `unslop` | `/skills/unslop/` | Post-process AI text |
| `product-manager-toolkit` | `/skills/product-manager-toolkit/` | PM frameworks |

---

## MCP Servers

| Server | Tools | Use For |
|---|---|---|
| `chrome-devtools` | 30+ tools (navigate, screenshot, click, fill, etc.) | Browser automation, UI testing |

---

## External APIs (Currently Integrated)

| API | Status | Config Location |
|---|---|---|
| **Valyu** | ✅ Working | Settings > API Keys |
| **Perplexity** | ✅ Working | Settings > API Keys |
| **OpenRouter** | ✅ Working | Settings > API Keys |
| **Deepgram** | ✅ Working | Voice Settings |
| **Google TTS** | ✅ Working | Voice Settings |
| **OpenAI** | ✅ Working | Settings > API Keys |

---

## Libraries to Investigate (NOT custom code)

| Need | Library | Notes |
|---|---|---|
| **Kanban board** | `@hello-pangea/dnd` | Fork of react-beautiful-dnd, 8k+ stars |
| **Kanban views** | `plane.so` | Open source project management |
| **Markdown editor** | Already using Tiptap/ProseMirror | Enhance existing |
| **PDF export** | Via `pdf-official` skill | Investigate underlying library |
| **CSET data** | `cisagov/cset` Docker | Full CSET integration |
