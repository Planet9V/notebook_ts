# Operations Guide

## Starting the Application

### Full Stack (Docker Compose)

```bash
cd /Users/jimmcknney/notebook_tetrel
docker compose up -d

# Verify all 5 services running
docker compose ps
```

### Development Mode

```bash
# Terminal 1: Backend
cd /Users/jimmcknney/notebook_tetrel
source .venv/bin/activate
python -m api.main  # Port 5055

# Terminal 2: Frontend
cd /Users/jimmcknney/notebook_tetrel/frontend
npm run dev  # Port 8502
```

## Health Checks

### API Health
```bash
# Overall system health
curl http://localhost:5055/api/config | python3 -m json.tool

# Voice services health
curl http://localhost:5055/api/voice/health | python3 -m json.tool

# Container status
curl http://localhost:5055/api/containers/status | python3 -m json.tool

# Platform info (GPU, memory, etc.)
curl http://localhost:5055/api/platform/info | python3 -m json.tool
```

### Direct Service Health
```bash
# SurrealDB
curl http://localhost:8000/health

# Kokoro TTS
curl http://localhost:8880/v1/audio/voices

# Whisper STT
curl http://localhost:8000/v1/models
```

## Monitoring

### Container Logs
```bash
# All containers
docker compose logs -f --tail 100

# Specific service
docker logs surrealdb --tail 50
docker logs kokoro-tts --tail 50
docker logs whisper-stt --tail 50

# Via API
curl "http://localhost:5055/api/containers/kokoro-tts/logs?lines=50"
```

### Database Monitoring
```bash
# Connect to SurrealDB directly
docker exec -it surrealdb /surreal sql \
  --conn http://localhost:8000 \
  --user root --pass root \
  --ns open_notebook --db open_notebook

# Useful queries:
# Count notebooks: SELECT count() FROM notebook GROUP ALL;
# Count sources: SELECT count() FROM source GROUP ALL;
# Active sessions: SELECT count() FROM chat_session GROUP ALL;
```

## Backup & Restore

### Database Backup
```bash
# Export full database
docker exec surrealdb /surreal export \
  --conn http://localhost:8000 \
  --user root --pass root \
  --ns open_notebook --db open_notebook \
  > backup_$(date +%Y%m%d).surql
```

### Database Restore
```bash
# Import from backup
docker exec -i surrealdb /surreal import \
  --conn http://localhost:8000 \
  --user root --pass root \
  --ns open_notebook --db open_notebook \
  < backup_20260527.surql
```

## Scaling

### GPU Acceleration

The platform auto-detects GPU capabilities:

```bash
# Check GPU detection
curl http://localhost:5055/api/platform/info | python3 -m json.tool | grep -A5 gpu
```

| GPU Type | Compute Type | STT Model | Expected Speed |
|----------|-------------|-----------|----------------|
| CUDA (NVIDIA) | float16 | large-v3 | ~10x realtime |
| ROCm (AMD) | float16 | large-v3 | ~8x realtime |
| MPS (Apple) | float32 | base.en | ~5x realtime |
| CPU only | int8 | base.en | ~2x realtime |

### Memory Requirements

| Service | Minimum | Recommended |
|---------|---------|-------------|
| SurrealDB | 256 MB | 1 GB |
| FastAPI Backend | 512 MB | 2 GB |
| LiveKit SFU | 128 MB | 512 MB |
| Kokoro TTS | 1 GB | 2 GB |
| Whisper STT | 1 GB | 4 GB (large model) |
| **Total** | **~3 GB** | **~10 GB** |

## Security

### Production Checklist

- [ ] Change `SURREAL_USER` and `SURREAL_PASSWORD` from defaults
- [ ] Set strong `OPEN_NOTEBOOK_ENCRYPTION_KEY` (min 32 chars)
- [ ] Configure HTTPS/TLS for all external access
- [ ] Restrict Docker network access
- [ ] Rotate LiveKit API keys
- [ ] Enable authentication (`OPEN_NOTEBOOK_AUTH_PASSWORD`)
