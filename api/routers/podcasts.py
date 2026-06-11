from pathlib import Path
from typing import List, Optional
from urllib.parse import unquote, urlparse
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from loguru import logger
from pydantic import BaseModel

from api.podcast_service import (
    PodcastGenerationRequest,
    PodcastGenerationResponse,
    PodcastService,
)
from api.models import (
    ScheduledEpisodeCreate,
    ScheduledEpisodeUpdate,
    ScheduledEpisodeResponse,
)
from open_notebook.domain.scheduled_episode import ScheduledEpisode
from open_notebook.database.repository import repo_query, repo_delete, ensure_record_id


router = APIRouter()


class PodcastEpisodeResponse(BaseModel):
    id: str
    name: str
    episode_profile: dict
    speaker_profile: dict
    briefing: str
    audio_file: Optional[str] = None
    audio_url: Optional[str] = None
    transcript: Optional[dict] = None
    outline: Optional[dict] = None
    created: Optional[str] = None
    job_status: Optional[str] = None
    error_message: Optional[str] = None


def _resolve_audio_path(audio_file: str) -> Path:
    from open_notebook.config import DATA_FOLDER
    base_dir = Path(DATA_FOLDER).resolve()

    if audio_file.startswith("file://"):
        parsed = urlparse(audio_file)
        target_path = Path(unquote(parsed.path))
    else:
        target_path = Path(audio_file)

    # If the path contains "podcasts/episodes/", anchor it relative to the current base_dir.
    # This prevents path traversal checks from failing (403/500) when sharing a database
    # between host (e.g. ./data) and Docker container (e.g. /app/data).
    target_posix = target_path.as_posix()
    if "podcasts/episodes/" in target_posix:
        rel_part = target_posix.split("podcasts/episodes/", 1)[1]
        target_path = base_dir / "podcasts" / "episodes" / rel_part

    resolved_path = target_path.resolve()
    try:
        resolved_path.relative_to(base_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="Path traversal attempt detected")
    return resolved_path




@router.post("/podcasts/generate", response_model=PodcastGenerationResponse)
async def generate_podcast(request: PodcastGenerationRequest):
    """
    Generate a podcast episode using Episode Profiles.
    Returns immediately with job ID for status tracking.
    """
    try:
        job_id = await PodcastService.submit_generation_job(
            episode_profile_name=request.episode_profile,
            speaker_profile_name=request.speaker_profile,
            episode_name=request.episode_name,
            notebook_id=request.notebook_id,
            content=request.content,
            briefing_suffix=request.briefing_suffix,
            tts_engine=request.tts_engine,
            voice_mapping=request.voice_mapping,
            target_duration=request.target_duration,
        )

        return PodcastGenerationResponse(
            job_id=job_id,
            status="submitted",
            message=f"Podcast generation started for episode '{request.episode_name}'",
            episode_profile=request.episode_profile,
            episode_name=request.episode_name,
        )

    except Exception as e:
        logger.exception("Error generating podcast")
        raise HTTPException(
            status_code=500, detail="Failed to generate podcast"
        )


@router.get("/podcasts/jobs/{job_id}")
async def get_podcast_job_status(job_id: str):
    """Get the status of a podcast generation job"""
    try:
        status_data = await PodcastService.get_job_status(job_id)
        return status_data

    except Exception as e:
        logger.exception("Error fetching podcast job status")
        raise HTTPException(
            status_code=500, detail="Failed to fetch job status"
        )


@router.get("/podcasts/episodes", response_model=List[PodcastEpisodeResponse])
async def list_podcast_episodes():
    """List all podcast episodes"""
    try:
        episodes = await PodcastService.list_episodes()

        # Fetch active or failed podcast generation commands from the database
        active_commands = await repo_query(
            "SELECT id, status, name, args, error_message FROM command WHERE name = 'generate_podcast' AND status IN ['new', 'running', 'failed', 'error']"
        )

        response_episodes = []
        episode_command_ids = set()

        # Group and deduplicate database episodes sharing the same command ID
        episodes_by_cmd = {}
        no_cmd_episodes = []
        for episode in episodes:
            if episode.command:
                cmd_id_str = str(episode.command)
                if cmd_id_str not in episodes_by_cmd:
                    episodes_by_cmd[cmd_id_str] = []
                episodes_by_cmd[cmd_id_str].append(episode)
            else:
                no_cmd_episodes.append(episode)

        # For each command group, pick the best episode (preferring the one with audio_file)
        filtered_episodes = list(no_cmd_episodes)
        for cmd_id_str, ep_list in episodes_by_cmd.items():
            best_ep = ep_list[0]
            for ep in ep_list:
                if ep.audio_file:
                    best_ep = ep
                    break
            filtered_episodes.append(best_ep)
            episode_command_ids.add(cmd_id_str)

        # Build response objects for database episodes
        for episode in filtered_episodes:
            # Skip incomplete episodes without command or audio
            if not episode.command and not episode.audio_file:
                continue

            # Get job status and error message if available
            job_status = None
            error_message = None
            if episode.command:
                try:
                    detail = await episode.get_job_detail()
                    job_status = detail["status"]
                    error_message = detail["error_message"]
                except Exception:
                    job_status = "unknown"
            else:
                # No command but has audio file = completed import
                job_status = "completed"

            audio_url = None
            if episode.audio_file:
                try:
                    audio_path = _resolve_audio_path(episode.audio_file)
                    if audio_path.exists():
                        audio_url = f"/api/podcasts/episodes/{episode.id}/audio"
                except Exception as path_err:
                    logger.warning(f"Could not resolve audio path for episode {episode.id}: {path_err}")

            response_episodes.append(
                PodcastEpisodeResponse(
                    id=str(episode.id),
                    name=episode.name,
                    episode_profile=episode.episode_profile,
                    speaker_profile=episode.speaker_profile,
                    briefing=episode.briefing,
                    audio_file=episode.audio_file,
                    audio_url=audio_url,
                    transcript=episode.transcript,
                    outline=episode.outline,
                    created=str(episode.created) if episode.created else None,
                    job_status=job_status,
                    error_message=error_message,
                )
            )

        # Synthesize placeholder episodes for active commands without database episode records yet
        for cmd in active_commands:
            cmd_id_str = str(cmd["id"])
            if cmd_id_str not in episode_command_ids:
                args = cmd.get("args") or {}
                ep_profile_name = args.get("episode_profile", "Default")
                sp_profile_name = args.get("speaker_profile", "Default")
                ep_name = args.get("episode_name", "Untitled Episode")
                
                response_episodes.append(
                    PodcastEpisodeResponse(
                        id=cmd_id_str,
                        name=ep_name,
                        episode_profile={"name": ep_profile_name},
                        speaker_profile={"name": sp_profile_name},
                        briefing="",
                        audio_file=None,
                        audio_url=None,
                        transcript=None,
                        outline=None,
                        created=None,
                        job_status=cmd["status"],
                        error_message=cmd.get("error_message"),
                    )
                )

        # Sort episodes placing placeholders/active items at the top
        def sort_key(x):
            return x.created or "9999-99-99"
        
        response_episodes.sort(key=sort_key, reverse=True)
        return response_episodes

    except Exception as e:
        logger.exception("Error listing podcast episodes")
        raise HTTPException(
            status_code=500, detail="Failed to list podcast episodes"
        )


@router.get("/podcasts/episodes/{episode_id}", response_model=PodcastEpisodeResponse)
async def get_podcast_episode(episode_id: str):
    """Get a specific podcast episode"""
    try:
        if episode_id.startswith("command:"):
            cmd_id = ensure_record_id(episode_id)
            res = await repo_query("SELECT * FROM command WHERE id = $cmd_id", {"cmd_id": cmd_id})
            if not res:
                raise HTTPException(status_code=404, detail="Job not found")
            cmd = res[0]
            args = cmd.get("args") or {}
            return PodcastEpisodeResponse(
                id=str(cmd["id"]),
                name=args.get("episode_name", "Untitled Episode"),
                episode_profile={"name": args.get("episode_profile", "Default")},
                speaker_profile={"name": args.get("speaker_profile", "Default")},
                briefing="",
                audio_file=None,
                audio_url=None,
                transcript=None,
                outline=None,
                created=None,
                job_status=cmd["status"],
                error_message=cmd.get("error_message"),
            )

        episode = await PodcastService.get_episode(episode_id)

        # Get job status and error message if available
        job_status = None
        error_message = None
        if episode.command:
            try:
                detail = await episode.get_job_detail()
                job_status = detail["status"]
                error_message = detail["error_message"]
            except Exception:
                job_status = "unknown"
        else:
            # No command but has audio file = completed import
            job_status = "completed" if episode.audio_file else "unknown"

        audio_url = None
        if episode.audio_file:
            try:
                audio_path = _resolve_audio_path(episode.audio_file)
                if audio_path.exists():
                    audio_url = f"/api/podcasts/episodes/{episode.id}/audio"
            except Exception as path_err:
                logger.warning(f"Could not resolve audio path for episode {episode.id}: {path_err}")

        return PodcastEpisodeResponse(
            id=str(episode.id),
            name=episode.name,
            episode_profile=episode.episode_profile,
            speaker_profile=episode.speaker_profile,
            briefing=episode.briefing,
            audio_file=episode.audio_file,
            audio_url=audio_url,
            transcript=episode.transcript,
            outline=episode.outline,
            created=str(episode.created) if episode.created else None,
            job_status=job_status,
            error_message=error_message,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching podcast episode")
        raise HTTPException(status_code=404, detail="Episode not found")


@router.get("/podcasts/episodes/{episode_id}/audio")
async def stream_podcast_episode_audio(episode_id: str):
    """Stream the audio file associated with a podcast episode"""
    try:
        episode = await PodcastService.get_episode(episode_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching podcast episode for audio")
        raise HTTPException(status_code=404, detail="Episode not found")

    if not episode.audio_file:
        raise HTTPException(status_code=404, detail="Episode has no audio file")

    audio_path = _resolve_audio_path(episode.audio_file)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename=audio_path.name,
    )


@router.post("/podcasts/episodes/{episode_id}/retry")
async def retry_podcast_episode(episode_id: str):
    """Retry a failed podcast episode by deleting it and submitting a new job"""
    try:
        if episode_id.startswith("command:"):
            cmd_id = ensure_record_id(episode_id)
            res = await repo_query("SELECT * FROM command WHERE id = $cmd_id", {"cmd_id": cmd_id})
            if not res:
                raise HTTPException(status_code=404, detail="Job not found")
            cmd = res[0]
            if cmd["status"] not in ("failed", "error"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Job is not in a failed state (current: {cmd['status']})",
                )
            args = cmd.get("args") or {}
            ep_profile_name = args.get("episode_profile")
            sp_profile_name = args.get("speaker_profile")
            episode_name = args.get("episode_name")
            content = args.get("content")
            notebook_id = args.get("notebook_id")
            briefing_suffix = args.get("briefing_suffix")
            tts_engine = args.get("tts_engine", "default")
            voice_mapping = args.get("voice_mapping")

            # Guard: refuse to retry if the original command is missing required fields.
            # This prevents the infinite retry loop where broken commands with only
            # episode_name keep getting resubmitted and immediately fail Pydantic validation.
            missing = []
            if not ep_profile_name:
                missing.append("episode_profile")
            if not sp_profile_name:
                missing.append("speaker_profile")
            if not content and not notebook_id:
                missing.append("content or notebook_id")
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Cannot retry: original command is missing required fields: "
                        f"{', '.join(missing)}. Please delete this job and create a new episode."
                    ),
                )

            # Delete the failed command record
            await repo_delete(cmd_id)

            # Submit a new job
            job_id = await PodcastService.submit_generation_job(
                episode_profile_name=ep_profile_name,
                speaker_profile_name=sp_profile_name,
                episode_name=episode_name,
                content=content,
                notebook_id=notebook_id,
                briefing_suffix=briefing_suffix,
                tts_engine=tts_engine,
                voice_mapping=voice_mapping,
            )
            return {"job_id": job_id, "message": "Retry submitted successfully"}

        episode = await PodcastService.get_episode(episode_id)

        # Validate episode is in a failed state
        detail = await episode.get_job_detail()
        if detail["status"] not in ("failed", "error"):
            raise HTTPException(
                status_code=400,
                detail=f"Episode is not in a failed state (current: {detail['status']})",
            )

        # Extract params for re-submission
        ep_profile_name = episode.episode_profile.get("name")
        sp_profile_name = episode.speaker_profile.get("name")
        episode_name = episode.name
        content = getattr(episode, "content", None)
        notebook_id = getattr(episode, "notebook_id", None)
        briefing_suffix = getattr(episode, "briefing_suffix", None)

        # Guard: refuse to retry if the episode is missing required fields
        if not content and not notebook_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot retry: episode has no content or notebook_id. "
                       "Please delete this episode and create a new one.",
            )

        if not ep_profile_name or not sp_profile_name:
            raise HTTPException(
                status_code=400,
                detail="Cannot retry: episode or speaker profile name missing from stored data",
            )

        # Delete audio file if any
        if episode.audio_file:
            audio_path = _resolve_audio_path(episode.audio_file)
            if audio_path.exists():
                try:
                    audio_path.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete audio file {audio_path}: {e}")

        # Delete the failed episode
        await episode.delete()

        # Submit a new job
        job_id = await PodcastService.submit_generation_job(
            episode_profile_name=ep_profile_name,
            speaker_profile_name=sp_profile_name,
            episode_name=episode_name,
            content=content,
            notebook_id=notebook_id,
            briefing_suffix=briefing_suffix,
        )

        return {"job_id": job_id, "message": "Retry submitted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error retrying podcast episode")
        raise HTTPException(
            status_code=500, detail="Failed to retry episode"
        )


@router.delete("/podcasts/episodes/{episode_id}")
async def delete_podcast_episode(episode_id: str):
    """Delete a podcast episode and its associated audio file"""
    try:
        if episode_id.startswith("command:"):
            cmd_id = ensure_record_id(episode_id)
            await repo_delete(cmd_id)
            logger.info(f"Deleted pending podcast command: {episode_id}")
            return {"message": "Episode deleted successfully", "episode_id": episode_id}

        # Get the episode first to check if it exists and get the audio file path
        episode = await PodcastService.get_episode(episode_id)

        # Delete the physical audio file if it exists
        if episode.audio_file:
            audio_path = _resolve_audio_path(episode.audio_file)
            if audio_path.exists():
                try:
                    audio_path.unlink()
                    logger.info(f"Deleted audio file: {audio_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete audio file {audio_path}: {e}")

        # Delete the episode from the database
        await episode.delete()

        logger.info(f"Deleted podcast episode: {episode_id}")
        return {"message": "Episode deleted successfully", "episode_id": episode_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting podcast episode")
        raise HTTPException(
            status_code=500, detail="Failed to delete episode"
        )


def _format_dt(dt) -> Optional[str]:
    if not dt:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


def _map_scheduled_episode_response(ep: ScheduledEpisode) -> ScheduledEpisodeResponse:
    return ScheduledEpisodeResponse(
        id=str(ep.id),
        notebook=ep.notebook,
        name=ep.name,
        episode_profile=ep.episode_profile,
        speaker_profile=ep.speaker_profile,
        schedule=ep.schedule,
        status=ep.status,
        last_run=_format_dt(ep.last_run),
        next_run=_format_dt(ep.next_run),
        created=_format_dt(ep.created) or "",
        updated=_format_dt(ep.updated) or "",
    )


@router.post("/podcasts/schedule", response_model=ScheduledEpisodeResponse)
async def create_scheduled_episode(request: ScheduledEpisodeCreate):
    """Create a scheduled episode config"""
    try:
        ep = ScheduledEpisode(
            notebook=request.notebook_id,
            name=request.name,
            episode_profile=request.episode_profile,
            speaker_profile=request.speaker_profile,
            schedule=request.schedule,
            status=request.status,
        )
        await ep.save()
        return _map_scheduled_episode_response(ep)
    except Exception as e:
        logger.exception("Error creating scheduled episode")
        raise HTTPException(
            status_code=500, detail=f"Failed to create scheduled episode: {str(e)}"
        )


@router.get("/podcasts/schedule", response_model=List[ScheduledEpisodeResponse])
async def list_scheduled_episodes():
    """List all scheduled episodes"""
    try:
        episodes = await ScheduledEpisode.get_all_episodes()
        return [_map_scheduled_episode_response(ep) for ep in episodes]
    except Exception as e:
        logger.exception("Error listing scheduled episodes")
        raise HTTPException(
            status_code=500, detail=f"Failed to list scheduled episodes: {str(e)}"
        )


@router.put("/podcasts/schedule/{schedule_id}", response_model=ScheduledEpisodeResponse)
async def update_scheduled_episode(schedule_id: str, request: ScheduledEpisodeUpdate):
    """Update a scheduled episode's status"""
    try:
        ep = await ScheduledEpisode.get(schedule_id)
        if request.status is not None:
            ep.status = request.status
        await ep.save()
        return _map_scheduled_episode_response(ep)
    except Exception as e:
        logger.exception(f"Error updating scheduled episode {schedule_id}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update scheduled episode: {str(e)}"
        )


@router.delete("/podcasts/schedule/{schedule_id}")
async def delete_scheduled_episode(schedule_id: str):
    """Delete a scheduled episode"""
    try:
        ep = await ScheduledEpisode.get(schedule_id)
        await ep.delete()
        return {"message": "Scheduled episode deleted successfully", "id": schedule_id}
    except Exception as e:
        logger.exception(f"Error deleting scheduled episode {schedule_id}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete scheduled episode: {str(e)}"
        )


@router.post("/podcasts/schedule/{schedule_id}/trigger")
async def trigger_scheduled_episode(schedule_id: str):
    """Instantly trigger a scheduled episode execution"""
    try:
        ep = await ScheduledEpisode.get(schedule_id)

        if not ep.notebook:
            raise HTTPException(
                status_code=400,
                detail="Scheduled episode has no notebook configured. "
                       "Please edit the schedule and select a notebook.",
            )

        logger.info(
            f"Triggering scheduled episode '{ep.name}' with notebook={ep.notebook}, "
            f"episode_profile={ep.episode_profile}, speaker_profile={ep.speaker_profile}"
        )

        job_id = await PodcastService.submit_generation_job(
            episode_profile_name=ep.episode_profile,
            speaker_profile_name=ep.speaker_profile,
            episode_name=ep.name,
            notebook_id=ep.notebook,
        )
        ep.last_run = datetime.now()
        await ep.save()
        return {"status": "triggered", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error triggering scheduled episode {schedule_id}")
        raise HTTPException(
            status_code=500, detail=f"Failed to trigger scheduled episode: {str(e)}"
        )
