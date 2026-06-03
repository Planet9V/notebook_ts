# Tetrel Notebook — Developer Wiki

> **Privacy-focused research and knowledge management, secured from the hardware up.**

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System architecture, Docker services, data flow diagrams |
| [API Reference](api-reference.md) | All 200+ API endpoints grouped by router |
| [Developer Guide](developer-guide.md) | Setup, testing, contributing |
| [Troubleshooting](troubleshooting.md) | Common issues and fixes |
| [Operations](operations.md) | Running, deploying, monitoring |

---

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd notebook_tetrel

# Start all services (SurrealDB, LiveKit, Kokoro TTS, Whisper STT)
docker compose up -d

# Start the frontend dev server
cd frontend && npm install && npm run dev

# Run tests
.venv/bin/pytest tests/ -v
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, LangChain, LangGraph |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| **Database** | SurrealDB (graph/document hybrid) |
| **Voice AI** | LiveKit SFU, Kokoro TTS, Faster Whisper STT |
| **LLM** | OpenRouter (multi-model: GPT-4o, Grok, Claude, Gemini) |
| **Container** | Docker Compose, supervisord |

## Key Directories

```
notebook_tetrel/
├── api/                    # FastAPI backend
│   ├── main.py            # App entrypoint, router registration
│   ├── routers/           # 37 router files (~200 endpoints)
│   ├── models.py          # Pydantic request/response models
│   └── auth.py            # Authentication middleware
├── frontend/              # Next.js frontend
│   └── src/
│       ├── app/           # App Router pages (19 dashboard pages)
│       ├── components/    # 107 React components
│       └── lib/           # API clients, hooks, utilities
├── open_notebook/         # Domain logic
│   ├── domain/            # Domain models (Notebook, Source, Note)
│   ├── database/          # SurrealDB repository layer
│   ├── graphs/            # LangGraph workflows (chat, research)
│   └── utils/             # Encryption, chunking, tokens
├── tests/                 # 331 pytest tests
├── docker-compose.yml     # 5 services
├── CLAUDE.md              # Karpathy development rules
└── .env.example           # Environment variable reference
```
