import pytest
import os
import zipfile
import shutil
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from open_notebook.tasks.backup_worker import (
    match_cron_field,
    cron_matches,
    is_scheduled_due,
    create_backup,
    restore_backup,
    check_and_run_scheduled_backups,
    get_http_url,
    BACKUPS_FOLDER,
)

def test_match_cron_field():
    assert match_cron_field(5, "*")
    assert match_cron_field(5, "5")
    assert not match_cron_field(5, "6")
    assert match_cron_field(5, "1,5,10")
    assert not match_cron_field(4, "1,5,10")
    assert match_cron_field(3, "1-5")
    assert not match_cron_field(6, "1-5")
    assert match_cron_field(10, "*/5")
    assert not match_cron_field(12, "*/5")


def test_cron_matches():
    # 2026-06-07 12:00:00 is a Sunday
    dt = datetime(2026, 6, 7, 12, 0, 0, tzinfo=timezone.utc)
    
    # "0 12 * * 0" -> 12:00 on Sunday
    assert cron_matches("0 12 * * 0", dt)
    # "0 12 * * 7" -> 12:00 on Sunday (7 is Sunday too)
    assert cron_matches("0 12 * * 7", dt)
    # "*/5 12 * * *"
    assert cron_matches("*/5 12 * * *", dt)
    # "0 13 * * *" -> different hour
    assert not cron_matches("0 13 * * *", dt)
    # "0 12 * * 1" -> Monday
    assert not cron_matches("0 12 * * 1", dt)


def test_is_scheduled_due():
    # Never run before -> due
    assert is_scheduled_due("0 0 * * *", None)
    
    # Run recently, cron not hit yet -> not due
    last_run = datetime.now(timezone.utc) - timedelta(minutes=10)
    assert not is_scheduled_due("0 0 * * *", last_run)
    
    # Run yesterday, cron hit hourly since then -> due
    now = datetime.now(timezone.utc)
    last_run = now - timedelta(hours=2, minutes=30)
    assert is_scheduled_due("0 * * * *", last_run)


def test_get_http_url():
    with patch("open_notebook.tasks.backup_worker.get_database_url", return_value="ws://localhost:8000/rpc"):
        assert get_http_url() == "http://localhost:8000"
    
    with patch("open_notebook.tasks.backup_worker.get_database_url", return_value="wss://surreal.example.com/rpc"):
        assert get_http_url() == "https://surreal.example.com"


@pytest.mark.asyncio
@patch("open_notebook.tasks.backup_worker.repo_create", new_callable=AsyncMock)
@patch("httpx.AsyncClient.get", new_callable=AsyncMock)
async def test_create_backup(mock_get, mock_repo_create):
    # Mock HTTP response for SurrealDB export
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "DEFINE TABLE test; INSERT INTO test {name: 'test_record'};"
    mock_get.return_value = mock_resp
    
    mock_repo_create.return_value = {"id": "backup:test_id"}
    
    # Trigger backup creation
    res = await create_backup(backup_type="manual")
    
    assert res == {"id": "backup:test_id"}
    mock_repo_create.assert_called_once()
    mock_get.assert_called_once()
    
    # Clean up file created during test
    created_filename = mock_repo_create.call_args[0][1]["filename"]
    created_filepath = os.path.join(BACKUPS_FOLDER, created_filename)
    if os.path.exists(created_filepath):
        os.remove(created_filepath)


@pytest.mark.asyncio
@patch("open_notebook.tasks.backup_worker.repo_query", new_callable=AsyncMock)
@patch("httpx.AsyncClient.post", new_callable=AsyncMock)
async def test_restore_backup(mock_post, mock_repo_query):
    # Setup mock zip file
    test_zip_path = os.path.join(BACKUPS_FOLDER, "test_restore_archive.zip")
    
    with zipfile.ZipFile(test_zip_path, 'w') as zip_file:
        zip_file.writestr("db_backup.surrealql", "DEFINE TABLE mock;")
        zip_file.writestr("uploads/test_file.txt", "mock content")
        
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_post.return_value = mock_resp
    
    # Mock repo query for INFO FOR DB;
    mock_repo_query.side_effect = [
        # First query: INFO FOR DB;
        [{"tables": {"mock": "DEFINE TABLE mock..."}}],
        # Second query: REMOVE TABLE mock;
        [],
    ]
    
    # Trigger restore
    await restore_backup(direct_file_path=test_zip_path)
    
    mock_post.assert_called_once()
    assert mock_repo_query.call_count == 2
    
    # Clean up
    if os.path.exists(test_zip_path):
        os.remove(test_zip_path)


@pytest.mark.asyncio
@patch("open_notebook.tasks.backup_worker.repo_update", new_callable=AsyncMock)
@patch("open_notebook.tasks.backup_worker.create_backup", new_callable=AsyncMock)
@patch("open_notebook.tasks.backup_worker.repo_query", new_callable=AsyncMock)
async def test_check_and_run_scheduled_backups(mock_query, mock_create, mock_update):
    # Mock active schedules
    mock_query.return_value = [
        {
            "id": "backup_schedule:weekly",
            "name": "Weekly Backup",
            "cron_expression": "0 0 * * 0",
            "enabled": True,
            "last_run_at": None,
        }
    ]
    
    mock_create.return_value = {"filename": "backup_weekly.zip"}
    
    triggered = await check_and_run_scheduled_backups()
    
    assert triggered == ["backup_weekly.zip"]
    mock_create.assert_called_once_with(backup_type="scheduled")
    mock_update.assert_called_once()
