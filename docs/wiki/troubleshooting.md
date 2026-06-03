# Troubleshooting

## Docker Services

### SurrealDB won't start
```bash
# Check logs
docker logs surrealdb 2>&1 | tail -20

# Common fix: port conflict
lsof -i :8000  # Check if port 8000 is in use
docker compose down && docker compose up -d surrealdb
```

### Voice services (LiveKit/Kokoro/Whisper) not responding
```bash
# Check all voice container health
curl http://localhost:7880  # LiveKit
curl http://localhost:8880/v1/audio/voices  # Kokoro TTS
curl http://localhost:8000/v1/models  # Whisper STT

# Restart voice stack
docker compose restart livekit-server kokoro-tts whisper-stt

# Check logs
docker logs kokoro-tts --tail 50
docker logs whisper-stt --tail 50
```

### Container health check via API
```bash
curl http://localhost:5055/api/containers/status | python3 -m json.tool
curl http://localhost:5055/api/voice/health | python3 -m json.tool
```

## Backend

### Tests failing with import errors
```bash
# Ensure virtual environment is active
source .venv/bin/activate
pip install -e ".[dev]"
```

### Tests failing with 404 errors
All routes are mounted at `/api` prefix. In tests, use:
```python
response = client.get("/api/notebooks")  # ✅ Correct
response = client.get("/notebooks")       # ❌ Wrong — will get 404
```

### Database connection errors
```bash
# Check SurrealDB is reachable
curl http://localhost:8000/health

# Verify env vars
grep SURREAL .env

# Check config endpoint
curl http://localhost:5055/api/config | python3 -m json.tool
```

### OpenRouter API errors
```bash
# Verify API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/models | head -20

# Common issues:
# - Rate limiting (429): Wait and retry
# - Invalid key (401): Re-set in Settings → API Keys
# - Model not found: Check model ID spelling
```

## Frontend

### TypeScript errors
```bash
cd frontend
npx tsc --noEmit 2>&1 | head -50
```

### Build fails
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### API calls returning 500
Check the backend logs:
```bash
docker logs open_notebook --tail 50
# Or if running locally:
tail -50 /tmp/open_notebook.log
```

## Voice Playground

### Microphone not working
1. Check browser permissions: Chrome → Settings → Privacy → Microphone
2. Must use HTTPS in production (WebRTC requires secure context)
3. Check `navigator.mediaDevices.getUserMedia` in console

### TTS not playing audio
```bash
# Test TTS directly
curl -X POST http://localhost:8880/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello", "voice": "af_heart", "speed": 1.0}' \
  --output test.wav
# Play: afplay test.wav (macOS)
```

### STT not transcribing
```bash
# Test STT directly with a WAV file
curl -X POST http://localhost:8000/v1/audio/transcriptions \
  -F "file=@test.wav" \
  -F "model=Systran/faster-whisper-base.en"
```
