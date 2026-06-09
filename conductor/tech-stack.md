# Tech Stack: Tetrel Notebook

## Languages & Frameworks
-   **Backend**: Python 3.12 (FastAPI ASGI, Loguru, pytest)
-   **Frontend**: Next.js 15 (React 19, Tailwind CSS, TypeScript 5)
-   **Package Managers**: `uv` (Python), `npm` (Node.js)

## Databases & Middleware
-   **SurrealDB v2**: Primary transactional document, relational, and graph database.
-   **PostgreSQL 17 (with pgvector)**: Vector embedding cache layer for high-speed research searches (using HNSW index).
-   **LiveKit & Kokoro TTS**: WebRTC voice assistant agent and local speech-to-text / text-to-speech services.

## Integrations
-   **Google API**: Google Drive & Workspace (Docs, Sheets, Slides) REST APIs using OAuth 2.0.
-   **HashiCorp Vault**: Encrypted secrets manager for OAuth tokens and API keys.
