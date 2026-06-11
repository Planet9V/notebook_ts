"""
Backup & Restore Background Worker

Provides functions to create unified ZIP backups (including SurrealDB export,
uploaded files, and LangGraph checkpoints) and restore them, as well as a
lightweight cron scheduler engine.
"""

import os
import zipfile
import shutil
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import httpx
from loguru import logger

from open_notebook.database.repository import (
    get_database_url,
    get_database_password,
    repo_create,
    repo_query,
    repo_update,
)
from open_notebook.config import UPLOADS_FOLDER, LANGGRAPH_CHECKPOINT_FILE, DATA_FOLDER

BACKUPS_FOLDER = os.path.join(DATA_FOLDER, "backups")
os.makedirs(BACKUPS_FOLDER, exist_ok=True)


def get_http_url() -> str:
    """Parse SURREAL_URL from repository and convert WebSocket to HTTP url."""
    ws_url = get_database_url()
    if ws_url.startswith("ws://"):
        http_url = ws_url.replace("ws://", "http://", 1)
    elif ws_url.startswith("wss://"):
        http_url = ws_url.replace("wss://", "https://", 1)
    else:
        http_url = ws_url

    if http_url.endswith("/rpc"):
        http_url = http_url[:-4]
    return http_url


async def create_backup(backup_type: str = "manual") -> Dict[str, Any]:
    """
    Creates a backup zip file containing:
    1. SurrealDB SQL export
    2. Contents of ./data/uploads/
    3. LangGraph checkpoints.sqlite (if exists)
    """
    # 1. Fetch SurrealDB SQL export
    http_url = get_http_url()
    user = os.environ.get("SURREAL_USER") or "root"
    password = get_database_password() or "root"
    ns = os.environ.get("SURREAL_NAMESPACE") or "open_notebook"
    db = os.environ.get("SURREAL_DATABASE") or "open_notebook"

    auth_str = f"{user}:{password}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    headers = {
        "Authorization": f"Basic {b64_auth}",
        "surreal-ns": ns,
        "surreal-db": db,
        "NS": ns,
        "DB": db,
        "Accept": "application/octet-stream",
    }

    logger.info(f"Triggering SurrealDB export from {http_url}/export")
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{http_url}/export", headers=headers, timeout=60.0)
        if r.status_code != 200:
            raise RuntimeError(f"Failed to export SurrealDB data (status {r.status_code}): {r.text}")
        sql_dump = r.text

    # 2. Package everything into a zip file
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.zip"
    file_path = os.path.join(BACKUPS_FOLDER, filename)

    with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # Write SurrealDB SQL dump
        zip_file.writestr("db_backup.surrealql", sql_dump)

        # Write UPLOADS_FOLDER contents
        if os.path.exists(UPLOADS_FOLDER):
            for root, dirs, files in os.walk(UPLOADS_FOLDER):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, UPLOADS_FOLDER)
                    zip_file.write(full_path, os.path.join("uploads", rel_path))

        # Write checkpoints file if it exists
        if os.path.exists(LANGGRAPH_CHECKPOINT_FILE):
            zip_file.write(LANGGRAPH_CHECKPOINT_FILE, "checkpoints.sqlite")

    size = os.path.getsize(file_path)

    # 3. Create database record
    backup_record = {
        "filename": filename,
        "file_path": file_path,
        "size": size,
        "backup_type": backup_type,
    }

    result = await repo_create("backup", backup_record)
    logger.info(f"Backup created successfully: {filename} ({size} bytes)")
    return result


async def restore_backup(
    backup_id: Optional[str] = None, direct_file_path: Optional[str] = None
) -> None:
    """
    Restores a backup zip file:
    1. Extracts the ZIP
    2. Clears the active SurrealDB database (using REMOVE TABLE for each table)
    3. Runs the SQL statements in the SurrealDB /import endpoint
    4. Clears UPLOADS_FOLDER and extracts files to UPLOADS_FOLDER
    5. Restores checkpoints.sqlite if it exists
    """
    if direct_file_path:
        file_path = direct_file_path
    elif backup_id:
        result = await repo_query(
            "SELECT * FROM backup WHERE id = $id", {"id": backup_id}
        )
        if not result:
            raise ValueError(f"Backup record not found: {backup_id}")
        file_path = result[0]["file_path"]
    else:
        raise ValueError("Must provide either backup_id or direct_file_path")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Backup file not found on disk: {file_path}")

    # 2. Extract ZIP to a temporary directory
    temp_extract_dir = os.path.join(BACKUPS_FOLDER, "temp_restore")
    if os.path.exists(temp_extract_dir):
        shutil.rmtree(temp_extract_dir)
    os.makedirs(temp_extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(file_path, "r") as zip_file:
            zip_file.extractall(temp_extract_dir)

        db_backup_path = os.path.join(temp_extract_dir, "db_backup.surrealql")
        if not os.path.exists(db_backup_path):
            raise FileNotFoundError("Missing db_backup.surrealql in backup archive")

        with open(db_backup_path, "r", encoding="utf-8") as f:
            sql_statements = f.read()

        # 3. Clear existing SurrealDB tables
        db_info = await repo_query("INFO FOR DB;")
        tables = []
        if db_info and isinstance(db_info, list):
            info = db_info[0]
            tables_dict = info.get("tables") or info.get("tb") or {}
            tables = list(tables_dict.keys())

        # Drop tables in sequence
        for table in tables:
            logger.info(f"Removing table: {table}")
            try:
                await repo_query(f"REMOVE TABLE {table};")
            except Exception as ex:
                logger.error(f"Failed to remove table {table}: {ex}")

        # 4. Import SQL statements
        http_url = get_http_url()
        user = os.environ.get("SURREAL_USER") or "root"
        password = get_database_password() or "root"
        ns = os.environ.get("SURREAL_NAMESPACE") or "open_notebook"
        db = os.environ.get("SURREAL_DATABASE") or "open_notebook"

        auth_str = f"{user}:{password}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()

        headers = {
            "Authorization": f"Basic {b64_auth}",
            "surreal-ns": ns,
            "surreal-db": db,
            "NS": ns,
            "DB": db,
            "Content-Type": "text/plain",
        }

        logger.info(f"Importing SurrealDB data to {http_url}/import")
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{http_url}/import",
                content=sql_statements.encode("utf-8"),
                headers=headers,
                timeout=120.0,
            )
            if r.status_code != 200:
                raise RuntimeError(f"Failed to import SurrealDB data: {r.text}")
            logger.info("SurrealDB import succeeded!")

        # 5. Restore UPLOADS_FOLDER
        temp_uploads = os.path.join(temp_extract_dir, "uploads")
        if os.path.exists(UPLOADS_FOLDER):
            shutil.rmtree(UPLOADS_FOLDER)
        os.makedirs(UPLOADS_FOLDER, exist_ok=True)

        if os.path.exists(temp_uploads):
            for item in os.listdir(temp_uploads):
                s = os.path.join(temp_uploads, item)
                d = os.path.join(UPLOADS_FOLDER, item)
                if os.path.isdir(s):
                    shutil.copytree(s, d)
                else:
                    shutil.copy2(s, d)

        # 6. Restore checkpoints.sqlite
        temp_checkpoint = os.path.join(temp_extract_dir, "checkpoints.sqlite")
        if os.path.exists(temp_checkpoint):
            checkpoint_dir = os.path.dirname(LANGGRAPH_CHECKPOINT_FILE)
            os.makedirs(checkpoint_dir, exist_ok=True)
            shutil.copy2(temp_checkpoint, LANGGRAPH_CHECKPOINT_FILE)

    finally:
        if os.path.exists(temp_extract_dir):
            shutil.rmtree(temp_extract_dir)


# Cron Scheduling Engine Helpers
def match_cron_field(val: int, pattern: str) -> bool:
    """Check if a value matches a cron field pattern (e.g., *, 5, */5, 1-5)."""
    if pattern == "*":
        return True

    # Handle lists: 1,2,3
    if "," in pattern:
        return any(match_cron_field(val, p) for p in pattern.split(","))

    # Handle ranges: 1-5
    if "-" in pattern:
        try:
            start, end = pattern.split("-")
            return int(start) <= val <= int(end)
        except ValueError:
            return False

    # Handle step: */5 or 1-10/2
    if "/" in pattern:
        try:
            lhs, step_str = pattern.split("/")
            step = int(step_str)
            if lhs == "*":
                return val % step == 0
            elif "-" in lhs:
                start, end = lhs.split("-")
                if int(start) <= val <= int(end):
                    return (val - int(start)) % step == 0
            else:
                start = int(lhs)
                return val >= start and (val - start) % step == 0
        except ValueError:
            return False

    try:
        return val == int(pattern)
    except ValueError:
        return False


def cron_matches(cron_str: str, dt: datetime) -> bool:
    """Evaluate if a specific datetime matches the 5-field cron pattern."""
    parts = cron_str.split()
    if len(parts) != 5:
        logger.warning(f"Invalid cron expression: '{cron_str}'")
        return False

    # Python weekday: 0=Monday, 6=Sunday.
    # Cron weekday: 0=Sunday, 6=Saturday, 7=Sunday.
    cron_weekday = (dt.weekday() + 1) % 7
    dow_pattern = parts[4].replace("7", "0")

    return (
        match_cron_field(dt.minute, parts[0])
        and match_cron_field(dt.hour, parts[1])
        and match_cron_field(dt.day, parts[2])
        and match_cron_field(dt.month, parts[3])
        and match_cron_field(cron_weekday, dow_pattern)
    )


def is_scheduled_due(cron_str: str, last_run: Optional[datetime]) -> bool:
    """
    Determine if a schedule is due.
    If last_run is None, it is due.
    Otherwise, we check if there is a matching cron minute between last_run and now (exclusive of last_run).
    """
    now = datetime.now(timezone.utc)
    if not last_run:
        return True

    # Make sure last_run has a timezone
    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=timezone.utc)

    # If last_run is in the future (skew), don't run
    if last_run > now:
        return False

    # Check minutes between last_run + 1 min and now.
    # Limit check to the last 24 hours to avoid infinite loops on very old last_run.
    start_time = max(last_run + timedelta(minutes=1), now - timedelta(days=1))

    # Align to minutes
    start_minute = start_time.replace(second=0, microsecond=0)
    end_minute = now.replace(second=0, microsecond=0)

    curr = start_minute
    while curr <= end_minute:
        if cron_matches(cron_str, curr):
            return True
        curr += timedelta(minutes=1)

    return False


async def check_and_run_scheduled_backups() -> List[str]:
    """Query active schedules in backup_schedule, check if they are due, and trigger creation."""
    triggered_backups = []
    try:
        schedules = await repo_query(
            "SELECT * FROM backup_schedule WHERE enabled = true;"
        )
        for sched in schedules:
            cron_expr = sched["cron_expression"]

            # Parse last_run_at if exists
            last_run_str = sched.get("last_run_at")
            last_run = None
            if last_run_str:
                try:
                    if isinstance(last_run_str, str):
                        last_run = datetime.fromisoformat(
                            last_run_str.replace("Z", "+00:00")
                        )
                    elif isinstance(last_run_str, datetime):
                        last_run = last_run_str
                except Exception as ex:
                    logger.error(
                        f"Failed to parse last_run_at for schedule {sched['id']}: {ex}"
                    )

            if is_scheduled_due(cron_expr, last_run):
                logger.info(
                    f"Triggering scheduled backup: {sched['name']} (cron: {cron_expr})"
                )
                try:
                    backup_res = await create_backup(backup_type="scheduled")
                    triggered_backups.append(backup_res["filename"])

                    # Update last_run_at
                    await repo_update(
                        "backup_schedule",
                        sched["id"],
                        {"last_run_at": datetime.now(timezone.utc)},
                    )
                except Exception as ex:
                    logger.error(
                        f"Failed to run scheduled backup {sched['name']}: {ex}"
                    )
    except Exception as e:
        logger.error(f"Error checking scheduled backups: {e}")

    return triggered_backups
