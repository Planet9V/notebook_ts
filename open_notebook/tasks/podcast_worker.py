"""
Podcast Scheduling Background Worker

Periodically checks active scheduled podcast episodes and triggers generation
for those that are due based on their cron schedules.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
from loguru import logger

from open_notebook.domain.scheduled_episode import ScheduledEpisode
from api.podcast_service import PodcastService

def matches_cron_field(val: int, pattern: str) -> bool:
    """Check if a value matches a cron field pattern (e.g., *, 5, */5, 1-5)."""
    if pattern == "*":
        return True
    
    # Handle lists: 1,2,3
    if "," in pattern:
        return any(matches_cron_field(val, p) for p in pattern.split(","))
        
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

def is_cron_time(dt: datetime, cron_str: str) -> bool:
    """Evaluate if a specific minute matches the 5-field cron pattern."""
    parts = cron_str.split()
    if len(parts) != 5:
        logger.warning(f"Invalid cron expression: '{cron_str}'")
        return False
        
    # Python weekday: 0=Monday, 6=Sunday.
    # Cron weekday: 0=Sunday, 6=Saturday, 7=Sunday.
    cron_weekday = (dt.weekday() + 1) % 7
    dow_pattern = parts[4].replace("7", "0")
    
    return (
        matches_cron_field(dt.minute, parts[0]) and
        matches_cron_field(dt.hour, parts[1]) and
        matches_cron_field(dt.day, parts[2]) and
        matches_cron_field(dt.month, parts[3]) and
        matches_cron_field(cron_weekday, dow_pattern)
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
        if is_cron_time(curr, cron_str):
            return True
        curr += timedelta(minutes=1)
        
    return False

async def trigger_due_episodes() -> list[str]:
    """Find active scheduled episodes, check if due, and submit generation jobs."""
    triggered_jobs = []
    try:
        episodes = await ScheduledEpisode.get_all_episodes()
        active_episodes = [ep for ep in episodes if ep.status == "active"]
        
        for ep in active_episodes:
            if is_scheduled_due(ep.schedule, ep.last_run):
                logger.info(f"Triggering scheduled episode: '{ep.name}' (schedule: {ep.schedule})")

                # Guard: skip episodes without a configured notebook
                if not ep.notebook:
                    logger.warning(
                        f"Skipping scheduled episode '{ep.name}': no notebook configured. "
                        "Edit the schedule to select a notebook."
                    )
                    continue

                try:
                    job_id = await PodcastService.submit_generation_job(
                        episode_profile_name=ep.episode_profile,
                        speaker_profile_name=ep.speaker_profile,
                        episode_name=ep.name,
                        notebook_id=ep.notebook,
                    )
                    ep.last_run = datetime.now(timezone.utc)
                    await ep.save()
                    triggered_jobs.append(job_id)
                    logger.info(f"Successfully triggered job {job_id} for episode '{ep.name}'")
                except Exception as ex:
                    logger.error(f"Failed to submit generation job for scheduled episode '{ep.name}': {ex}")
                    # Update status to failed to avoid spamming errors, or let it retry?
                    # The instruction says "transitioning status or similar", let's keep status active unless needed, but log error
    except Exception as e:
        logger.error(f"Error checking due scheduled episodes: {e}")
        
    return triggered_jobs
