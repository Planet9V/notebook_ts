import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

from open_notebook.tasks.podcast_worker import (
    matches_cron_field,
    is_cron_time,
    is_scheduled_due,
    trigger_due_episodes,
)
from open_notebook.domain.scheduled_episode import ScheduledEpisode

def test_matches_cron_field():
    assert matches_cron_field(5, "*")
    assert matches_cron_field(5, "5")
    assert not matches_cron_field(5, "6")
    assert matches_cron_field(5, "1,5,10")
    assert not matches_cron_field(4, "1,5,10")
    assert matches_cron_field(3, "1-5")
    assert not matches_cron_field(6, "1-5")
    assert matches_cron_field(10, "*/5")
    assert not matches_cron_field(12, "*/5")

def test_is_cron_time():
    # 2026-06-07 12:00:00 is a Sunday
    dt = datetime(2026, 6, 7, 12, 0, 0, tzinfo=timezone.utc)
    
    # "0 12 * * 0" -> 12:00 on Sunday
    assert is_cron_time(dt, "0 12 * * 0")
    # "0 12 * * 7" -> 12:00 on Sunday (7 is Sunday too)
    assert is_cron_time(dt, "0 12 * * 7")
    # "*/5 12 * * *"
    assert is_cron_time(dt, "*/5 12 * * *")
    # "0 13 * * *" -> different hour
    assert not is_cron_time(dt, "0 13 * * *")
    # "0 12 * * 1" -> Monday
    assert not is_cron_time(dt, "0 12 * * 1")

def test_is_scheduled_due():
    # Never run before -> due
    assert is_scheduled_due("0 0 * * *", None)
    
    # Run recently, cron not hit yet -> not due
    last_run = datetime.now(timezone.utc) - timedelta(minutes=10)
    # Cron at midnight every day
    assert not is_scheduled_due("0 0 * * *", last_run)
    
    # Run yesterday, cron hit 5 hours ago -> due
    # Let's say cron runs every hour at minute 0
    # Last run was 2 hours 30 mins ago. Current minute is 15. So we hit a minute 0 since then.
    now = datetime.now(timezone.utc)
    last_run = now - timedelta(hours=2, minutes=30)
    # Ensure there is a minute 0 in between
    assert is_scheduled_due("0 * * * *", last_run)

@pytest.mark.asyncio
@patch("open_notebook.tasks.podcast_worker.PodcastService.submit_generation_job", new_callable=AsyncMock)
@patch("open_notebook.domain.scheduled_episode.ScheduledEpisode.get_all_episodes", new_callable=AsyncMock)
@patch.object(ScheduledEpisode, "save", new_callable=AsyncMock)
async def test_trigger_due_episodes(mock_save, mock_get_all, mock_submit):
    mock_submit.return_value = "command:test_job_456"
    
    # Create fake active and due episode
    ep1 = ScheduledEpisode(
        notebook="notebook:test_nb",
        name="Weekly Test 1",
        episode_profile="Standard Profile",
        speaker_profile="Standard Speakers",
        schedule="* * * * *",
        status="active",
        last_run=None
    )
    
    # Create fake paused episode
    ep2 = ScheduledEpisode(
        notebook="notebook:test_nb",
        name="Weekly Test 2",
        episode_profile="Standard Profile",
        speaker_profile="Standard Speakers",
        schedule="* * * * *",
        status="paused",
        last_run=None
    )
    
    mock_get_all.return_value = [ep1, ep2]
    
    jobs = await trigger_due_episodes()
    
    assert len(jobs) == 1
    assert jobs[0] == "command:test_job_456"
    assert ep1.last_run is not None
    mock_save.assert_called()
    mock_submit.assert_called_once_with(
        episode_profile_name="Standard Profile",
        speaker_profile_name="Standard Speakers",
        episode_name="Weekly Test 1",
        notebook_id="notebook:test_nb"
    )
