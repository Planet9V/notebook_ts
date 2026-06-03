# Architecture

## System Overview

Tetrel Notebook is a privacy-focused research & knowledge management platform with integrated Voice AI, compliance auditing, and CRM capabilities.

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Browser (Next.js 15)"]
    end
    
    subgraph "Application Layer (Docker)"
        App["open_notebook<br/>FastAPI + Next.js<br/>Ports: 5055, 8502"]
        
        subgraph "Voice AI Services"
            LiveKit["LiveKit SFU<br/>Port: 7880"]
            Kokoro["Kokoro TTS<br/>Port: 8880"]
            Whisper["Faster Whisper STT<br/>Port: 8000"]
        end
    end
    
    subgraph "Data Layer"
        SurrealDB["SurrealDB<br/>Port: 8000<br/>Graph + Document DB"]
    end
    
    subgraph "External APIs"
        OpenRouter["OpenRouter<br/>Multi-LLM Gateway"]
        HuggingFace["Hugging Face<br/>Embedding Models"]
    end
    
    Browser --> App
    App --> SurrealDB
    App --> LiveKit
    App --> Kokoro
    App --> Whisper
    App --> OpenRouter
    App --> HuggingFace
```

## Docker Compose Services

Defined in [docker-compose.yml](file:///Users/jimmcknney/notebook_tetrel/docker-compose.yml):

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `surrealdb` | `surrealdb/surrealdb:v2.2.1` | 8000 | Graph/document database |
| `open_notebook` | Built from Dockerfile | 5055, 8502 | Backend API + Frontend |
| `livekit-server` | `livekit/livekit-server` (pinned SHA) | 7880 | WebRTC SFU for voice |
| `kokoro-tts` | `ghcr.io/remsky/kokoro-fastapi-cpu` (pinned SHA) | 8880 | Text-to-Speech |
| `whisper-stt` | `fedirz/faster-whisper-server` (pinned SHA) | 8000 | Speech-to-Text |

## Backend Architecture

```mermaid
graph LR
    subgraph "FastAPI Application"
        Main["main.py<br/>App Entry"]
        Auth["auth.py<br/>Middleware"]
        
        subgraph "Routers (37 files)"
            R1["notebooks.py"]
            R2["chat.py"]
            R3["voice.py"]
            R4["customers.py"]
            R5["assessments.py"]
            R6["search.py"]
            R7["... 31 more"]
        end
        
        subgraph "Domain Layer"
            D1["Notebook"]
            D2["Source"]
            D3["ChatSession"]
            D4["Customer"]
        end
        
        subgraph "Data Layer"
            Repo["repository.py<br/>repo_query/create/update/delete"]
            DB["SurrealDB Client"]
        end
    end
    
    Main --> Auth
    Auth --> R1 & R2 & R3 & R4 & R5 & R6 & R7
    R1 & R2 --> D1 & D2 & D3
    R4 & R5 --> D4
    D1 & D2 & D3 & D4 --> Repo
    Repo --> DB
```

### Router Registration

All routers are registered in [main.py](file:///Users/jimmcknney/notebook_tetrel/api/main.py#L346-L379) with the `/api` prefix:

| Router | Prefix | Description |
|--------|--------|-------------|
| `auth` | `/api/auth` | Authentication status |
| `config` | `/api/config` | Version, DB health |
| `notebooks` | `/api/notebooks` | Notebook CRUD + graph validation |
| `chat` | `/api/chat` | Chat sessions + LLM execution |
| `voice` | `/api/voice` | LiveKit tokens, TTS, STT, health |
| `voice_rag` | `/api/voice` | Voice RAG chat pipeline |
| `voice_sessions` | `/api/voice` | Voice session persistence |
| `customers` | `/api/customers` | CRM customer management |
| `contacts` | `/api/contacts` | Contact management |
| `assessments` | `/api/assessments` | CSET compliance assessments |
| `sources` | `/api/sources` | Document source management |
| `notes` | `/api/notes` | Note CRUD |
| `search` | `/api/search` | Full-text + semantic search |
| `podcasts` | `/api/podcasts` | AI podcast generation |
| `containers` | `/api/containers` | Docker container monitoring |
| `platform` | `/api/platform` | GPU/system detection |

## Frontend Architecture

```mermaid
graph TB
    subgraph "Next.js App Router"
        Layout["RootLayout<br/>layout.tsx"]
        
        subgraph "Dashboard Pages (19)"
            P1["/ (Home)"]
            P2["/notebooks"]
            P3["/customers"]
            P4["/compliance"]
            P5["/pipeline"]
            P6["/voice-playground"]
            P7["/settings"]
            P8["/search"]
            P9["... 11 more"]
        end
        
        subgraph "Components (107)"
            C1["VoiceChatPanel"]
            C2["CSETNetworkCanvas"]
            C3["KanbanBoard"]
            C4["AddSourceDialog"]
        end
        
        subgraph "Lib"
            API["api/ clients (24)"]
            Hooks["hooks/ (32)"]
            Store["zustand stores"]
        end
    end
    
    Layout --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9
    P1 & P2 --> C1 & C2 & C3 & C4
    C1 & C2 --> API & Hooks
    API --> Store
```

## Voice Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant STT as Whisper STT
    participant LLM as OpenRouter LLM
    participant TTS as Kokoro TTS
    
    User->>Browser: Press & hold mic button
    Browser->>Browser: MediaRecorder.start()
    User->>Browser: Release mic button
    Browser->>Browser: MediaRecorder.stop() → Blob
    Browser->>STT: POST /voice/stt/transcribe (FormData)
    STT-->>Browser: { text: "user's speech" }
    Browser->>LLM: POST /voice/chat/simple { text, use_rag }
    LLM-->>Browser: { answer: "AI response text" }
    Browser->>TTS: POST /voice/tts/synthesize { input, voice, speed }
    TTS-->>Browser: audio/wav blob
    Browser->>Browser: new Audio(blob).play()
    Browser->>User: AI speaks response
```

## Database Schema

SurrealDB uses a graph model with record-linked entities:

```mermaid
erDiagram
    notebook ||--o{ reference : "has sources"
    notebook ||--o{ artifact : "has notes"
    notebook ||--o{ chat_session : "has chats"
    source ||--o{ reference : "linked to"
    source ||--o{ source_insight : "has insights"
    customer ||--o{ assessment : "has assessments"
    customer ||--o{ contact : "has contacts"
    assessment ||--o{ assessment_session : "has sessions"
    assessment_session ||--o{ assessment_answer : "has answers"
    regulation ||--o{ question : "has questions"
    notebook {
        string name
        string description
        bool archived
        string stage
        string customer_id
        json topology
    }
    source {
        string title
        string content
        string source_type
        json insights
    }
    customer {
        string name
        string industry
        string size
        int employee_count
    }
    contact {
        string first_name
        string last_name
        string email
        string title
        string customer_id
    }
```

## Environment Variables

Key configuration from [.env.example](file:///Users/jimmcknney/notebook_tetrel/.env.example):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPEN_NOTEBOOK_ENCRYPTION_KEY` | ✅ | `change-me-to-a-secret-string` | Credential encryption key |
| `SURREAL_URL` | ✅ | `ws://surrealdb:8000/rpc` | Database WebSocket URL |
| `SURREAL_USER` | ✅ | `root` | Database username |
| `SURREAL_PASSWORD` | ✅ | `root` | Database password |
| `LIVEKIT_API_KEY` | ❌ | `devkey` | LiveKit API key |
| `LIVEKIT_API_SECRET` | ❌ | `secret` | LiveKit API secret |
| `LIVEKIT_URL` | ❌ | `http://livekit-server:7880` | LiveKit server URL |
| `KOKORO_TTS_URL` | ❌ | `http://kokoro-tts:8880` | TTS service URL |
| `WHISPER_STT_URL` | ❌ | `http://whisper-stt:8000` | STT service URL |
| `OPENAI_API_KEY` | ❌ | — | OpenAI API key |
| `OPENROUTER_API_KEY` | ❌ | — | OpenRouter multi-LLM key |
