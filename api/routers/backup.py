"""
Backup & Restore Router

FastAPI routes for list, create, download, delete, restore, upload-restore,
and schedule configurations.
"""

import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, File, UploadFile, Depends
from fastapi.responses import FileResponse
from loguru import logger
from pydantic import BaseModel, Field

from open_notebook.database.repository import (
    repo_query,
    repo_delete,
    repo_create,
    repo_update,
)
from open_notebook.tasks.backup_worker import (
    create_backup,
    restore_backup,
    BACKUPS_FOLDER,
)

router = APIRouter()


class BackupScheduleCreate(BaseModel):
    name: str = Field(..., description="Name of the backup schedule")
    cron_expression: str = Field(..., description="5-field cron expression")
    enabled: Optional[bool] = Field(True, description="Whether the schedule is active")


class BackupScheduleUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the backup schedule")
    cron_expression: Optional[str] = Field(None, description="5-field cron expression")
    enabled: Optional[bool] = Field(None, description="Whether the schedule is active")


@router.get("/backup/list", response_model=List[Dict[str, Any]])
async def list_backups():
    """List all created backups."""
    try:
        backups = await repo_query("SELECT * FROM backup ORDER BY created_at DESC;")
        return backups
    except Exception as e:
        logger.error(f"Failed to list backups: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup/create", status_code=201)
async def trigger_manual_backup():
    """Manually trigger a backup creation."""
    try:
        backup = await create_backup(backup_type="manual")
        return {"message": "Backup created successfully", "backup": backup}
    except Exception as e:
        logger.error(f"Failed to create manual backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backup/download/{filename}")
async def download_backup(filename: str):
    """Serve a backup zip file securely."""
    # Prevent directory traversal attacks
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(BACKUPS_FOLDER, safe_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Backup file not found")

    return FileResponse(
        file_path, filename=safe_filename, media_type="application/zip"
    )


@router.delete("/backup/{backup_id}")
async def delete_backup(backup_id: str):
    """Delete backup file and record."""
    try:
        # Fetch the backup record to get file path
        result = await repo_query(
            "SELECT * FROM backup WHERE id = $id", {"id": backup_id}
        )
        if not result:
            raise HTTPException(status_code=404, detail="Backup not found")

        file_path = result[0]["file_path"]
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as ex:
                logger.error(f"Failed to remove backup file from disk: {ex}")

        await repo_delete(backup_id)
        return {"message": f"Backup '{result[0]['filename']}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup/restore/{backup_id}")
async def restore_from_id(backup_id: str):
    """Restore database and uploads from an existing backup ID."""
    try:
        await restore_backup(backup_id=backup_id)
        return {"message": "Database and uploads restored successfully"}
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))
    except Exception as e:
        logger.error(f"Failed to restore backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup/upload-restore")
async def restore_from_upload(file: UploadFile = File(...)):
    """Restore database and uploads from an uploaded backup ZIP file."""
    temp_zip_path = os.path.join(BACKUPS_FOLDER, "temp_uploaded_restore.zip")
    try:
        # Save uploaded file
        with open(temp_zip_path, "wb") as f:
            content = await file.read()
            f.write(content)

        await restore_backup(direct_file_path=temp_zip_path)
        return {"message": "Uploaded backup restored successfully"}
    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=400, detail=str(fnf_err))
    except Exception as e:
        logger.error(f"Failed to restore uploaded backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_zip_path):
            try:
                os.remove(temp_zip_path)
            except Exception:
                pass


@router.get("/backup/schedules", response_model=List[Dict[str, Any]])
async def list_schedules():
    """List all backup schedules."""
    try:
        schedules = await repo_query("SELECT * FROM backup_schedule ORDER BY created_at DESC;")
        return schedules
    except Exception as e:
        logger.error(f"Failed to list schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/backup/schedules", status_code=201)
async def create_schedule(request: BackupScheduleCreate):
    """Create a new backup schedule."""
    try:
        parts = request.cron_expression.split()
        if len(parts) != 5:
            raise HTTPException(
                status_code=400, detail="Cron expression must have exactly 5 fields"
            )

        data = {
            "name": request.name,
            "cron_expression": request.cron_expression,
            "enabled": request.enabled,
        }
        result = await repo_create("backup_schedule", data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/backup/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, request: BackupScheduleUpdate):
    """Update or toggle a backup schedule."""
    try:
        result = await repo_query(
            "SELECT * FROM backup_schedule WHERE id = $id", {"id": schedule_id}
        )
        if not result:
            raise HTTPException(status_code=404, detail="Schedule not found")

        update_data = request.model_dump(exclude_unset=True)
        if "cron_expression" in update_data:
            parts = update_data["cron_expression"].split()
            if len(parts) != 5:
                raise HTTPException(
                    status_code=400, detail="Cron expression must have exactly 5 fields"
                )

        updated = await repo_update("backup_schedule", schedule_id, update_data)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/backup/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Delete a backup schedule."""
    try:
        result = await repo_query(
            "SELECT * FROM backup_schedule WHERE id = $id", {"id": schedule_id}
        )
        if not result:
            raise HTTPException(status_code=404, detail="Schedule not found")

        await repo_delete(schedule_id)
        return {"message": "Schedule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))
