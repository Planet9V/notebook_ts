# Load environment variables
from dotenv import load_dotenv

load_dotenv()

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.auth import PasswordAuthMiddleware
from api.routers import (
    activities,
    agents,
    assessments,
    auth,
    chat,
    config,
    contacts,
    containers,
    context,
    credentials,
    customers,
    embedding,
    embedding_rebuild,
    episode_profiles,
    import_export,
    insights,
    languages,
    locations,
    models,
    notebooks,
    notes,
    organizations,
    pipeline,
    platform,
    podcasts,
    projects,
    regulations,
    research_items,
    scheduled_search,
    search,
    settings,
    source_chat,
    sources,
    speaker_profiles,
    styleguides,
    transformations,
    voice,
    voice_rag,
    voice_sessions,
    skills,
    mcp,
    publications,
)
from api.routers import commands as commands_router
from open_notebook.database.async_migrate import AsyncMigrationManager
from open_notebook.exceptions import (
    AuthenticationError,
    ConfigurationError,
    ExternalServiceError,
    InvalidInputError,
    NetworkError,
    NotFoundError,
    OpenNotebookError,
    RateLimitError,
)
from open_notebook.utils.encryption import get_secret_from_env


def _parse_cors_origins(raw: str) -> list[str]:
    """Parse CORS_ORIGINS env value into a list of origins."""
    value = raw.strip()
    if value == "*":
        return ["*"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


# Parsed once at module load; CORS_ORIGINS changes require a restart.
_cors_origins_raw = os.getenv("CORS_ORIGINS")
CORS_ALLOWED_ORIGINS = _parse_cors_origins(_cors_origins_raw or "*")
CORS_IS_DEFAULT_WILDCARD = _cors_origins_raw is None


def _cors_headers(request: Request) -> dict[str, str]:
    """
    Build CORS headers for error responses.

    Mirrors Starlette CORSMiddleware behavior: reflects the request Origin
    when the origin is allowed (or when wildcard is configured, since
    browsers reject `Access-Control-Allow-Origin: *` combined with
    credentials). Omits `Access-Control-Allow-Origin` for disallowed
    origins so the browser blocks the error body from leaking cross-origin.
    """
    origin = request.headers.get("origin")
    headers: dict[str, str] = {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }

    if origin and ("*" in CORS_ALLOWED_ORIGINS or origin in CORS_ALLOWED_ORIGINS):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Vary"] = "Origin"

    return headers


# Import commands to register them in the API process
try:
    logger.info("Commands imported in API process")
except Exception as e:
    logger.error(f"Failed to import commands in API process: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler for the FastAPI application.
    Runs database migrations automatically on startup.
    """
    # Startup: Security checks
    logger.info("Starting API initialization...")

    # Security check: Encryption key
    if not get_secret_from_env("OPEN_NOTEBOOK_ENCRYPTION_KEY"):
        logger.warning(
            "OPEN_NOTEBOOK_ENCRYPTION_KEY not set. "
            "API key encryption will fail until this is configured. "
            "Set OPEN_NOTEBOOK_ENCRYPTION_KEY to any secret string."
        )

    # Run database migrations

    try:
        migration_manager = AsyncMigrationManager()
        current_version = await migration_manager.get_current_version()
        logger.info(f"Current database version: {current_version}")

        if await migration_manager.needs_migration():
            logger.warning("Database migrations are pending. Running migrations...")
            await migration_manager.run_migration_up()
            new_version = await migration_manager.get_current_version()
            logger.success(
                f"Migrations completed successfully. Database is now at version {new_version}"
            )
        else:
            logger.info(
                "Database is already at the latest version. No migrations needed."
            )
    except Exception as e:
        logger.error(f"CRITICAL: Database migration failed: {str(e)}")
        logger.exception(e)
        # Fail fast - don't start the API with an outdated database schema
        raise RuntimeError(f"Failed to run database migrations: {str(e)}") from e

    # Run podcast profile data migration (legacy strings -> Model registry)
    try:
        from open_notebook.podcasts.migration import migrate_podcast_profiles

        await migrate_podcast_profiles()
    except Exception as e:
        logger.warning(f"Podcast profile migration encountered errors: {e}")
        # Non-fatal: profiles can be migrated manually via UI

    logger.success("API initialization completed successfully")

    # Start periodic model sync (daily, background)
    sync_task = asyncio.create_task(_periodic_model_sync())
    pub_task = asyncio.create_task(_periodic_publications_check())
    search_task = asyncio.create_task(_periodic_searches_check())
    podcast_task = asyncio.create_task(_periodic_podcasts_check())
    research_items_task = asyncio.create_task(_periodic_research_items_check())

    # Yield control to the application
    yield

    # Shutdown: cancel background tasks
    for task in [sync_task, pub_task, search_task, podcast_task, research_items_task]:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    logger.info("API shutdown complete")


async def _periodic_model_sync():
    """
    Background task that syncs provider models once per day.
    First sync runs 30 seconds after startup, then every 24 hours.
    Only updates models whose attributes have actually changed.
    """
    import os

    SYNC_INTERVAL_HOURS = int(os.environ.get("MODEL_SYNC_INTERVAL_HOURS", "24"))

    # Initial delay: let the app fully start before syncing
    await asyncio.sleep(30)

    while True:
        try:
            from open_notebook.ai.model_discovery import sync_all_providers

            logger.info("Starting periodic model sync...")
            results = await sync_all_providers()

            total_discovered = sum(r[0] for r in results.values())
            total_new = sum(r[1] for r in results.values())
            total_existing = sum(r[2] for r in results.values())

            logger.success(
                f"Periodic model sync complete: "
                f"{total_discovered} discovered, {total_new} new, "
                f"{total_existing} existing across {len(results)} providers"
            )
        except Exception as e:
            logger.error(f"Periodic model sync failed: {e}")

        # Sleep until next sync
        await asyncio.sleep(SYNC_INTERVAL_HOURS * 3600)


async def _periodic_publications_check():
    """
    Run every 60 seconds to check for due publications and track metrics.
    """
    try:
        from open_notebook.tasks.publication_worker import publish_due_posts, track_published_post_metrics
    except ImportError as e:
        logger.error(f"Failed to import publication task: {e}")
        return

    # Sleep initially to let the server start up
    await asyncio.sleep(5)
    while True:
        try:
            logger.info("Background publication worker checking for due posts...")
            await publish_due_posts()
            await track_published_post_metrics()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic publications check: {e}")
        await asyncio.sleep(60)


async def _periodic_searches_check():
    """
    Run every 5 minutes to execute due searches.
    """
    try:
        from open_notebook.domain.scheduled_search_worker import run_all_due_searches
    except ImportError as e:
        logger.error(f"Failed to import scheduled search task: {e}")
        return

    # Sleep initially to let the server start up
    await asyncio.sleep(10)
    while True:
        try:
            logger.info("Background search worker checking for due searches...")
            await run_all_due_searches()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic searches check: {e}")
        await asyncio.sleep(300)


async def _periodic_podcasts_check():
    """
    Run every 5 minutes to trigger scheduled episode generations.
    """
    try:
        from open_notebook.tasks.podcast_worker import trigger_due_episodes
    except ImportError as e:
        logger.error(f"Failed to import podcast worker task: {e}")
        return

    # Sleep initially to let the server start up
    await asyncio.sleep(15)
    while True:
        try:
            logger.info("Background podcast worker checking for due episodes...")
            await trigger_due_episodes()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic podcasts check: {e}")
        await asyncio.sleep(300)


async def _periodic_research_items_check():
    """
    Run every 5 minutes (300 seconds) to trigger due scheduled recurring research items.
    """
    try:
        from open_notebook.domain.research_item import ResearchItem
        from api.routers.research_items import background_run_research
    except ImportError as e:
        logger.error(f"Failed to import research item models or tasks: {e}")
        return

    # Sleep initially to let the server start up
    await asyncio.sleep(20)
    while True:
        try:
            logger.info("Background research items worker checking for due recurring items...")
            due_items = await ResearchItem.get_due_items()
            if due_items:
                logger.info(f"Found {len(due_items)} due research items to execute.")
                for item in due_items:
                    # Execute in background task so they run concurrently without blocking the loop
                    asyncio.create_task(background_run_research(item.id))
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic research items check: {e}")
        await asyncio.sleep(300)


app = FastAPI(
    title="Open Notebook API",
    description="API for Open Notebook - Research Assistant",
    lifespan=lifespan,
)

if CORS_IS_DEFAULT_WILDCARD:
    logger.warning(
        "CORS_ORIGINS is not set — API accepts cross-origin requests from any "
        "origin (default: '*'). For production deployments, set CORS_ORIGINS to "
        "your frontend origin(s), e.g. "
        "CORS_ORIGINS=https://notebook.example.com"
    )
else:
    logger.info(f"CORS allowed origins: {CORS_ALLOWED_ORIGINS}")

# Add password authentication middleware first
# Exclude /api/auth/status and /api/config from authentication
app.add_middleware(
    PasswordAuthMiddleware,
    excluded_paths=[
        "/",
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/api/auth/status",
        "/api/config",
    ],
)

# Add CORS middleware last (so it processes first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom exception handler to ensure CORS headers are included in error responses
# This helps when errors occur before the CORS middleware can process them
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Custom exception handler that ensures CORS headers are included in error responses.
    This is particularly important for 413 (Payload Too Large) errors during file uploads.

    Note: If a reverse proxy (nginx, traefik) returns 413 before the request reaches
    FastAPI, this handler won't be called. In that case, configure your reverse proxy
    to add CORS headers to error responses.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={**(exc.headers or {}), **_cors_headers(request)},
    )


@app.exception_handler(NotFoundError)
async def not_found_error_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(InvalidInputError)
async def invalid_input_error_handler(request: Request, exc: InvalidInputError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=401,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(RateLimitError)
async def rate_limit_error_handler(request: Request, exc: RateLimitError):
    return JSONResponse(
        status_code=429,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(ConfigurationError)
async def configuration_error_handler(request: Request, exc: ConfigurationError):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(NetworkError)
async def network_error_handler(request: Request, exc: NetworkError):
    return JSONResponse(
        status_code=502,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(ExternalServiceError)
async def external_service_error_handler(request: Request, exc: ExternalServiceError):
    return JSONResponse(
        status_code=502,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


@app.exception_handler(OpenNotebookError)
async def open_notebook_error_handler(request: Request, exc: OpenNotebookError):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=_cors_headers(request),
    )


# Include routers
app.include_router(organizations.router)
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(config.router, prefix="/api", tags=["config"])
app.include_router(notebooks.router, prefix="/api", tags=["notebooks"])
app.include_router(import_export.router, prefix="/api", tags=["import_export"])
app.include_router(customers.router, prefix="/api", tags=["customers"])
app.include_router(contacts.router, prefix="/api", tags=["contacts"])
app.include_router(locations.router, prefix="/api", tags=["locations"])
app.include_router(activities.router, prefix="/api", tags=["activities"])
app.include_router(regulations.router, prefix="/api", tags=["regulations"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(models.router, prefix="/api", tags=["models"])
app.include_router(transformations.router, prefix="/api", tags=["transformations"])
app.include_router(notes.router, prefix="/api", tags=["notes"])
app.include_router(embedding.router, prefix="/api", tags=["embedding"])
app.include_router(
    embedding_rebuild.router, prefix="/api/embeddings", tags=["embeddings"]
)
app.include_router(settings.router, prefix="/api", tags=["settings"])
app.include_router(context.router, prefix="/api", tags=["context"])
app.include_router(sources.router, prefix="/api", tags=["sources"])
app.include_router(insights.router, prefix="/api", tags=["insights"])
app.include_router(commands_router.router, prefix="/api", tags=["commands"])
app.include_router(podcasts.router, prefix="/api", tags=["podcasts"])
app.include_router(episode_profiles.router, prefix="/api", tags=["episode-profiles"])
app.include_router(speaker_profiles.router, prefix="/api", tags=["speaker-profiles"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(source_chat.router, prefix="/api", tags=["source-chat"])
app.include_router(credentials.router, prefix="/api", tags=["credentials"])
app.include_router(languages.router, prefix="/api", tags=["languages"])
app.include_router(pipeline.router, prefix="/api", tags=["pipeline"])
app.include_router(scheduled_search.router, prefix="/api", tags=["scheduled-searches"])
app.include_router(assessments.router, prefix="/api", tags=["assessments"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(research_items.router, prefix="/api", tags=["research-items"])
app.include_router(styleguides.router, prefix="/api", tags=["styleguides"])
app.include_router(voice.router, prefix="/api", tags=["voice"])
app.include_router(containers.router, prefix="/api", tags=["containers"])
app.include_router(platform.router, prefix="/api", tags=["platform"])
app.include_router(voice_rag.router, prefix="/api", tags=["voice-rag"])
app.include_router(voice_sessions.router, prefix="/api", tags=["voice-sessions"])
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(skills.router, prefix="/api", tags=["skills"])
app.include_router(mcp.router, prefix="/api", tags=["mcp"])
app.include_router(publications.router, prefix="/api", tags=["publications"])


@app.get("/")
async def root():
    return {"message": "Open Notebook API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
