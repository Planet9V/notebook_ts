# API Reference

All endpoints are prefixed with `/api`. Interactive docs available at `http://localhost:8502/api/docs`.

---

## Authentication

### `GET /api/auth/status`
Check if authentication is enabled.

**Response:**
```json
{ "auth_enabled": false, "message": "Authentication is disabled" }
```

---

## Config

### `GET /api/config`
Get app version, update status, and database health.

**Response:**
```json
{
  "version": "1.0.0",
  "latestVersion": "1.1.0",
  "hasUpdate": true,
  "dbStatus": "online"
}
```

---

## Notebooks

### `GET /api/notebooks`
List all notebooks. Query params: `archived` (bool), `order_by` (string: `name|created|updated [asc|desc]`).

### `POST /api/notebooks`
Create a new notebook. Body: `{ "name": "...", "description": "...", "stage": "lead" }`

### `GET /api/notebooks/{id}`
Get a specific notebook by ID.

### `PUT /api/notebooks/{id}`
Update notebook fields.

### `DELETE /api/notebooks/{id}`
Delete notebook. Query: `delete_exclusive_sources` (bool).

### `GET /api/notebooks/{id}/delete-preview`
Preview what will be deleted.

### `POST /api/notebooks/{id}/sources/{source_id}`
Link a source to a notebook.

### `DELETE /api/notebooks/{id}/sources/{source_id}`
Unlink a source from a notebook.

### `POST /api/graph/validate`
Validate network topology against Purdue Model security zones.

---

## Chat

### `GET /api/chat/sessions?notebook_id=X`
List chat sessions for a notebook.

### `POST /api/chat/sessions`
Create a new chat session. Body: `{ "notebook_id": "...", "title": "..." }`

### `GET /api/chat/sessions/{id}`
Get session with messages.

### `PUT /api/chat/sessions/{id}`
Update session title or model override.

### `DELETE /api/chat/sessions/{id}`
Delete a chat session.

### `POST /api/chat/execute`
Execute a chat message. Body: `{ "session_id": "...", "message": "...", "context": {} }`

### `POST /api/chat/context`
Build RAG context for a notebook.

---

## Voice AI

### `GET /api/voice/health`
Health check for all voice services (LiveKit, Kokoro, Whisper).

### `GET /api/voice/token`
Generate LiveKit JWT token. Query: `room`, `identity`.

### `POST /api/voice/tts/synthesize`
Text-to-speech synthesis. Body: `{ "input": "...", "voice": "af_heart", "speed": 1.0 }`

### `POST /api/voice/stt/transcribe`
Speech-to-text transcription. Multipart form with `file` field.

### `POST /api/voice/chat/simple`
Voice RAG chat. Body: `{ "text": "...", "use_rag": true, "voice": "af_heart" }`

### `POST /api/voice/sessions`
Create a voice session.

### `POST /api/voice/sessions/{id}/messages`
Add message to voice session.

### `GET /api/voice/settings`
Get voice settings (multi-engine config).

### `PUT /api/voice/settings`
Update voice settings.

---

## Customers

### `GET /api/customers`
List all customers.

### `POST /api/customers`
Create a customer.

### `GET /api/customers/{id}`
Get customer by ID.

### `PUT /api/customers/{id}`
Update customer.

### `DELETE /api/customers/{id}`
Delete customer.

---

## Contacts

### `GET /api/contacts`
List contacts. Query: `customer_id`, `status`.

### `POST /api/contacts`
Create contact.

### `GET /api/contacts/{id}`
Get contact by ID.

### `PUT /api/contacts/{id}`
Update contact.

### `DELETE /api/contacts/{id}`
Delete contact.

### `GET /api/customers/{id}/contacts`
List contacts for a specific customer.

---

## Sources

### `GET /api/sources`
List sources.

### `POST /api/sources`
Create/upload a source.

### `GET /api/sources/{id}`
Get source by ID.

### `DELETE /api/sources/{id}`
Delete source.

---

## Search

### `GET /api/search`
Full-text and semantic search across sources and notes.

---

## Assessments

### `GET /api/assessments`
List compliance assessments.

### `POST /api/assessments`
Create an assessment (link customer to framework).

### `POST /api/assessments/sessions`
Start an audit session.

### `POST /api/assessments/answers`
Submit audit answers.

---

## Containers

### `GET /api/containers/status`
Get status of all Docker containers.

### `GET /api/containers/{name}/logs`
Get container logs. Query: `lines`, `since`.

### `GET /api/containers/{name}/health`
Health check for a specific container.

### `POST /api/containers/{name}/restart`
Restart a container.

---

## Platform

### `GET /api/platform/info`
System info: OS, CPU, RAM, GPU detection, Docker version.
