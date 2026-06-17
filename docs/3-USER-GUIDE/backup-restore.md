# Backup & Restore

Tetrel Notebook includes a built-in backup and restore system for your SurrealDB database. Use it regularly to protect your notebooks, sources, notes, and research.

## What Gets Backed Up

| Data | Backup Method |
|---|---|
| Notebooks, Sources, Notes, Research | SurrealDB export via Admin UI |
| Voice sessions, Podcast data | SurrealDB export |
| Vector embeddings (research memory) | PostgreSQL pg_dump (manual) |
| Uploaded files | Docker volume backup (manual) |

## Backup via Admin UI

1. Navigate to **Settings → Admin → Database**
2. Click **Export Database**
3. The system generates a `.surql` file containing all your data
4. Save the file in a safe location

The export uses `GET /api/import-export/export` and returns a complete SurrealQL dump.

## Restore via Admin UI

> [!CAUTION]
> Restore replaces existing data. Run a fresh export first to avoid data loss.

1. Navigate to **Settings → Admin → Database**
2. Click **Import Database**
3. Select your `.surql` backup file
4. Confirm the import

The import uses `POST /api/import-export/import` and re-executes all SurrealQL statements in the backup file.

## Automated / Scheduled Backups

For production deployments, set up a scheduled backup by mounting the SurrealDB data directory and running a cron job:

```bash
# Example: daily backup at 2am
0 2 * * * docker exec surrealdb surrealdb export --conn http://localhost:8000 --user root --pass root > /backups/tetrel-$(date +%Y%m%d).surql
```

## PostgreSQL Vector Store Backup

The research memory vector store lives in PostgreSQL (pgvector). Back it up separately:

```bash
# Backup
docker exec postgres pg_dump -U postgres pgvector_db > /backups/pgvector-$(date +%Y%m%d).sql

# Restore
docker exec -i postgres psql -U postgres pgvector_db < /backups/pgvector-20260612.sql
```

## Docker Volume Backup

To back up uploaded source files and the SurrealDB RocksDB data directory:

```bash
# List volumes
docker volume ls | grep notebook

# Backup a volume
docker run --rm \
  -v notebook_tetrel_surreal-data:/data \
  -v /backups:/backup \
  alpine tar czf /backup/surreal-data-$(date +%Y%m%d).tar.gz /data
```

## Restore from Docker Volume Backup

```bash
docker run --rm \
  -v notebook_tetrel_surreal-data:/data \
  -v /backups:/backup \
  alpine tar xzf /backup/surreal-data-20260612.tar.gz -C /
```

## Migration Safety

The system runs database migrations automatically on startup (50 migrations as of June 2026). If a restore brings you to an earlier schema version, restart the containers — migrations apply forward automatically.

## Troubleshooting

| Issue | Solution |
|---|---|
| Export returns empty file | Check that SurrealDB service is healthy: `docker compose ps` |
| Import fails with schema error | The backup was made with a different migration version. Contact support. |
| pgvector data missing after restore | Restore the PostgreSQL backup separately (it's a separate service) |
| Uploaded files missing | Restore the Docker volume backup for the uploads directory |
