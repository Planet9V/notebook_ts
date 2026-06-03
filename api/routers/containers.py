"""
Container Observatory API — Docker service monitoring and management.

Provides endpoints for inspecting container status, viewing logs,
and restarting services in the application's Docker Compose stack.
"""

import re
import subprocess
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, Field

router = APIRouter()


# ── Response Models ──────────────────────────────────────────────────


class ContainerInfo(BaseModel):
    """Status information for a single Docker container."""

    id: str = Field(..., description="Container ID (short)")
    name: str = Field(..., description="Container name")
    image: str = Field(..., description="Docker image name:tag")
    status: str = Field(..., description="Human-readable status (e.g., 'Up 2 hours')")
    state: str = Field(..., description="Container state (running/exited/restarting)")
    ports: str = Field(default="", description="Port mappings")
    created: str = Field(default="", description="Creation timestamp")
    uptime: str = Field(default="", description="Uptime string")
    size: Optional[str] = Field(default=None, description="Container size")


class ContainerStatusResponse(BaseModel):
    """Response for container status listing."""

    containers: List[ContainerInfo] = Field(default_factory=list)
    total: int = 0
    error: Optional[str] = None


class ContainerLogsResponse(BaseModel):
    """Response for container log retrieval."""

    name: str
    logs: str
    lines_returned: int


class ContainerHealthResponse(BaseModel):
    """Response for container health check."""

    name: str
    healthy: bool
    details: str


class ContainerActionResponse(BaseModel):
    """Response for container actions (restart, etc.)."""

    name: str
    action: str
    success: bool
    message: str


# ── Validation ───────────────────────────────────────────────────────

_CONTAINER_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$")


def _validate_container_name(name: str) -> str:
    """Validate container name to prevent command injection."""
    if not _CONTAINER_NAME_RE.match(name) or len(name) > 128:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid container name: {name!r}",
        )
    return name


# ── Helpers ──────────────────────────────────────────────────────────


def _run_docker_cmd(args: List[str], timeout: int = 10) -> subprocess.CompletedProcess:
    """Run a docker command safely with timeout."""
    try:
        return subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Docker CLI not found. Ensure docker is installed and on PATH.",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail=f"Docker command timed out after {timeout}s",
        )


# ── Endpoints ────────────────────────────────────────────────────────


@router.get("/containers/status", response_model=ContainerStatusResponse)
async def get_container_status():
    """
    List all Docker containers with their current status.
    Uses `docker ps -a` to include stopped containers.
    """
    try:
        result = _run_docker_cmd(
            [
                "docker",
                "ps",
                "-a",
                "--format",
                '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}",'
                '"status":"{{.Status}}","state":"{{.State}}",'
                '"ports":"{{.Ports}}","created":"{{.CreatedAt}}",'
                '"size":"{{.Size}}"}',
            ]
        )

        if result.returncode != 0:
            logger.warning(f"docker ps failed: {result.stderr}")
            return ContainerStatusResponse(
                error=f"Docker command failed: {result.stderr.strip()}"
            )

        import json

        containers = []
        for line in result.stdout.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                # Extract uptime from status field
                uptime = data.get("status", "")

                containers.append(
                    ContainerInfo(
                        id=data.get("id", "")[:12],
                        name=data.get("name", "unknown"),
                        image=data.get("image", ""),
                        status=data.get("status", "unknown"),
                        state=data.get("state", "unknown"),
                        ports=data.get("ports", ""),
                        created=data.get("created", ""),
                        uptime=uptime,
                        size=data.get("size") or None,
                    )
                )
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Failed to parse container line: {line!r} — {e}")

        return ContainerStatusResponse(containers=containers, total=len(containers))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting container status: {e}")
        return ContainerStatusResponse(error=str(e))


@router.get("/containers/{name}/logs", response_model=ContainerLogsResponse)
async def get_container_logs(
    name: str,
    lines: int = Query(default=100, ge=1, le=5000),
    since: Optional[str] = Query(default=None, description="e.g., '1h', '30m', '2024-01-01'"),
):
    """
    Get recent logs for a specific Docker container.
    """
    name = _validate_container_name(name)

    cmd = ["docker", "logs", "--tail", str(lines)]
    if since:
        # Validate 'since' format loosely
        if re.match(r"^[a-zA-Z0-9.:T-]+$", since):
            cmd.extend(["--since", since])
    cmd.append(name)

    result = _run_docker_cmd(cmd, timeout=15)

    # Docker logs go to both stdout and stderr
    log_text = result.stdout + result.stderr

    if result.returncode != 0 and not log_text:
        raise HTTPException(
            status_code=404,
            detail=f"Container '{name}' not found or not accessible",
        )

    lines_returned = len(log_text.strip().split("\n")) if log_text.strip() else 0

    return ContainerLogsResponse(
        name=name,
        logs=log_text,
        lines_returned=lines_returned,
    )


@router.get("/containers/{name}/health", response_model=ContainerHealthResponse)
async def get_container_health(name: str):
    """
    Check health status of a specific container.
    Uses docker inspect for health status, falls back to running state.
    """
    name = _validate_container_name(name)

    # Try to get health status
    result = _run_docker_cmd(
        [
            "docker",
            "inspect",
            "--format",
            "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}",
            name,
        ]
    )

    if result.returncode != 0:
        raise HTTPException(
            status_code=404,
            detail=f"Container '{name}' not found",
        )

    output = result.stdout.strip()
    parts = output.split("|")
    state = parts[0] if parts else "unknown"
    health = parts[1] if len(parts) > 1 else "no-healthcheck"

    if health == "healthy":
        return ContainerHealthResponse(name=name, healthy=True, details="Health check passing")
    elif health == "no-healthcheck":
        # Fall back to running state
        is_running = state == "running"
        return ContainerHealthResponse(
            name=name,
            healthy=is_running,
            details=f"No health check configured. State: {state}",
        )
    else:
        return ContainerHealthResponse(
            name=name,
            healthy=False,
            details=f"Health: {health}, State: {state}",
        )


@router.post("/containers/{name}/restart", response_model=ContainerActionResponse)
async def restart_container(name: str):
    """
    Restart a specific Docker container.
    """
    name = _validate_container_name(name)
    logger.info(f"Restarting container: {name}")

    result = _run_docker_cmd(["docker", "restart", name], timeout=30)

    if result.returncode != 0:
        logger.error(f"Failed to restart {name}: {result.stderr}")
        return ContainerActionResponse(
            name=name,
            action="restart",
            success=False,
            message=f"Restart failed: {result.stderr.strip()}",
        )

    logger.info(f"Successfully restarted container: {name}")
    return ContainerActionResponse(
        name=name,
        action="restart",
        success=True,
        message=f"Container '{name}' restarted successfully",
    )
