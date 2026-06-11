import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from loguru import logger
from pydantic import BaseModel
from surreal_commands import CommandInput, CommandOutput, command

from open_notebook.config import DATA_FOLDER
from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.podcasts.models import (
    EpisodeProfile,
    PodcastEpisode,
    SpeakerProfile,
    _resolve_model_config,
)

try:
    from podcast_creator import configure, create_podcast
except ImportError as e:
    logger.error(f"Failed to import podcast_creator: {e}")
    raise ValueError("podcast_creator library not available")


def build_episode_output_dir(data_folder: str) -> tuple[str, Path]:
    """Build a filesystem-safe output directory path for a podcast episode.

    Uses a UUID as the directory name so the path is safe regardless of
    what the user typed as episode name (spaces, special chars, etc.).

    Returns:
        A tuple of (episode_dir_name, output_dir_path).
    """
    episode_dir_name = str(uuid.uuid4())
    output_dir = Path(f"{data_folder}/podcasts/episodes/{episode_dir_name}")
    return episode_dir_name, output_dir


def full_model_dump(model):
    if isinstance(model, BaseModel):
        return model.model_dump()
    elif isinstance(model, dict):
        return {k: full_model_dump(v) for k, v in model.items()}
    elif isinstance(model, list):
        return [full_model_dump(item) for item in model]
    else:
        return model


class PodcastGenerationInput(CommandInput):
    episode_profile: str
    speaker_profile: str
    episode_name: str
    content: str
    briefing_suffix: Optional[str] = None
    notebook_id: Optional[str] = None
    tts_engine: str = "default"  # "default" | "kokoro" | "openai"
    voice_mapping: Optional[Dict[str, str]] = None  # speaker_name → voice_id
    target_duration: Optional[str] = None  # target duration string e.g. "30s" or "13m"


class PodcastGenerationOutput(CommandOutput):
    success: bool
    episode_id: Optional[str] = None
    audio_file_path: Optional[str] = None
    transcript: Optional[dict] = None
    outline: Optional[dict] = None
    processing_time: float
    error_message: Optional[str] = None


def parse_duration(duration_str: Optional[str]) -> int:
    """Parse duration string like '30s', '13m', '5 minutes' into seconds."""
    if not duration_str:
        return 0
    import re
    s = duration_str.strip().lower()
    m = re.match(r"^([\d.]+)\s*(s|sec|seconds?|m|min|minutes?)$", s)
    if m:
        val = float(m.group(1))
        unit = m.group(2)
        if unit.startswith("m"):
            return int(val * 60)
        else:
            return int(val)
    try:
        val = float(s)
        if val <= 30:
            return int(val * 60) # assume minutes if small
        else:
            return int(val) # assume seconds if larger
    except ValueError:
        pass
    return 0


@command("generate_podcast", app="open_notebook", retry={"max_attempts": 1})
async def generate_podcast_command(
    input_data: PodcastGenerationInput,
) -> PodcastGenerationOutput:
    """
    Real podcast generation using podcast-creator library with Episode Profiles
    """
    start_time = time.time()

    try:
        logger.info(
            f"Starting podcast generation for episode: {input_data.episode_name}"
        )
        logger.info(f"Using episode profile: {input_data.episode_profile}")

        # 1. Load Episode and Speaker profiles from SurrealDB
        episode_profile = await EpisodeProfile.get_by_name(input_data.episode_profile)
        if not episode_profile:
            raise ValueError(
                f"Episode profile '{input_data.episode_profile}' not found"
            )

        speaker_profile = await SpeakerProfile.get_by_name(
            episode_profile.speaker_config
        )
        if not speaker_profile:
            raise ValueError(
                f"Speaker profile '{episode_profile.speaker_config}' not found"
            )

        logger.info(f"Loaded episode profile: {episode_profile.name}")
        logger.info(f"Loaded speaker profile: {speaker_profile.name}")

        # 2. Validate that model registry fields are populated
        if not episode_profile.outline_llm:
            raise ValueError(
                f"Episode profile '{episode_profile.name}' has no outline model configured. "
                "Please update the profile to select an outline model."
            )
        if not episode_profile.transcript_llm:
            raise ValueError(
                f"Episode profile '{episode_profile.name}' has no transcript model configured. "
                "Please update the profile to select a transcript model."
            )
        if not speaker_profile.voice_model:
            raise ValueError(
                f"Speaker profile '{speaker_profile.name}' has no voice model configured. "
                "Please update the profile to select a voice model."
            )

        # 3. Resolve model configs with credentials
        outline_provider, outline_model_name, outline_config = (
            await episode_profile.resolve_outline_config()
        )
        transcript_provider, transcript_model_name, transcript_config = (
            await episode_profile.resolve_transcript_config()
        )
        tts_provider, tts_model_name, tts_config = (
            await speaker_profile.resolve_tts_config()
        )

        logger.info(
            f"Resolved models - outline: {outline_provider}/{outline_model_name}, "
            f"transcript: {transcript_provider}/{transcript_model_name}, "
            f"tts: {tts_provider}/{tts_model_name}"
        )

        # 4. Load all profiles and configure podcast-creator
        episode_profiles = await repo_query("SELECT * FROM episode_profile")
        speaker_profiles = await repo_query("SELECT * FROM speaker_profile")

        # Transform the surrealdb array into a dictionary for podcast-creator
        episode_profiles_dict = {
            profile["name"]: profile for profile in episode_profiles
        }
        speaker_profiles_dict = {
            profile["name"]: profile for profile in speaker_profiles
        }

        # 5. Inject resolved model configs into profile dicts
        # Resolve ALL episode profiles (podcast-creator validates all).
        # Remove profiles that fail resolution to prevent validation errors.
        for ep_name in list(episode_profiles_dict.keys()):
            ep_dict = episode_profiles_dict[ep_name]
            try:
                if not ep_dict.get("outline_llm") or not ep_dict.get("transcript_llm"):
                    raise ValueError("Missing outline_llm or transcript_llm")
                
                prov, model, conf = await _resolve_model_config(
                    str(ep_dict["outline_llm"])
                )
                ep_dict["outline_provider"] = prov
                ep_dict["outline_model"] = model
                ep_dict["outline_config"] = conf
                
                prov, model, conf = await _resolve_model_config(
                    str(ep_dict["transcript_llm"])
                )
                ep_dict["transcript_provider"] = prov
                ep_dict["transcript_model"] = model
                ep_dict["transcript_config"] = conf
            except Exception as e:
                logger.warning(
                    f"Failed to resolve models for episode profile '{ep_name}', "
                    f"removing from config to prevent validation errors: {e}"
                )
                del episode_profiles_dict[ep_name]

        # Resolve TTS for ALL speaker profiles (podcast-creator validates all).
        # Remove profiles that fail resolution to prevent validation errors.
        for sp_name in list(speaker_profiles_dict.keys()):
            sp_dict = speaker_profiles_dict[sp_name]
            if not sp_dict.get("voice_model"):
                logger.warning(
                    f"Speaker profile '{sp_name}' has no voice_model configured, "
                    "removing from config to prevent validation errors."
                )
                del speaker_profiles_dict[sp_name]
                continue

            try:
                prov, model, conf = await _resolve_model_config(
                    str(sp_dict["voice_model"])
                )
                sp_dict["tts_provider"] = prov
                sp_dict["tts_model"] = model
                sp_dict["tts_config"] = conf
            except Exception as e:
                logger.warning(
                    f"Failed to resolve TTS for speaker profile '{sp_name}', "
                    f"removing from config to prevent validation errors: {e}"
                )
                del speaker_profiles_dict[sp_name]
                continue

            # Per-speaker TTS overrides
            for speaker in sp_dict.get("speakers", []):
                if speaker.get("voice_model"):
                    try:
                        prov, model, conf = await _resolve_model_config(
                            str(speaker["voice_model"])
                        )
                        speaker["tts_provider"] = prov
                        speaker["tts_model"] = model
                        speaker["tts_config"] = conf
                    except Exception as e:
                        logger.warning(
                            f"Failed to resolve per-speaker TTS for '{speaker.get('name')}': {e}"
                        )
                else:
                    # Fall back to profile-level resolved TTS settings if not overridden
                    speaker["tts_provider"] = sp_dict.get("tts_provider")
                    speaker["tts_model"] = sp_dict.get("tts_model")
                    speaker["tts_config"] = sp_dict.get("tts_config")

        # 5b. Apply TTS engine override (Kokoro / OpenAI)
        if input_data.tts_engine == "kokoro":
            kokoro_url = os.getenv("KOKORO_TTS_URL", "http://kokoro-tts:8880")
            logger.info(f"Overriding TTS to Kokoro at {kokoro_url}")
            voice_mapping = input_data.voice_mapping or {}
            # Override the active speaker profile's TTS config
            sp_name_active = speaker_profile.name
            if sp_name_active in speaker_profiles_dict:
                sp_dict = speaker_profiles_dict[sp_name_active]
                # Set profile-level TTS to OpenAI provider with Kokoro base_url
                sp_dict["tts_provider"] = "openai"
                sp_dict["tts_model"] = "kokoro"
                sp_dict["tts_config"] = {
                    "base_url": f"{kokoro_url}/v1",
                    "api_key": "not-needed",  # Kokoro doesn't require auth
                }
                # Apply voice_mapping to individual speakers
                for speaker in sp_dict.get("speakers", []):
                    speaker_name = speaker.get("name", "")
                    if speaker_name in voice_mapping:
                        speaker["voice_id"] = voice_mapping[speaker_name]
                    speaker["tts_provider"] = "openai"
                    speaker["tts_model"] = "kokoro"
                    speaker["tts_config"] = {
                        "base_url": f"{kokoro_url}/v1",
                        "api_key": "not-needed",
                    }
        elif input_data.tts_engine == "openai":
            logger.info("Overriding TTS to OpenAI")
            openai_key = os.getenv("OPENAI_API_KEY", "")
            voice_mapping = input_data.voice_mapping or {}
            sp_name_active = speaker_profile.name
            if sp_name_active in speaker_profiles_dict:
                sp_dict = speaker_profiles_dict[sp_name_active]
                sp_dict["tts_provider"] = "openai"
                sp_dict["tts_model"] = "tts-1"
                sp_dict["tts_config"] = {"api_key": openai_key} if openai_key else {}
                for speaker in sp_dict.get("speakers", []):
                    speaker_name = speaker.get("name", "")
                    if speaker_name in voice_mapping:
                        speaker["voice_id"] = voice_mapping[speaker_name]
                    speaker["tts_provider"] = "openai"
                    speaker["tts_model"] = "tts-1"
                    speaker["tts_config"] = {"api_key": openai_key} if openai_key else {}

        # 6. Generate briefing & handle duration constraints
        briefing = episode_profile.default_briefing
        if input_data.briefing_suffix:
            briefing += f"\n\nAdditional instructions: {input_data.briefing_suffix}"

        num_segments = episode_profile.num_segments
        duration_seconds = parse_duration(input_data.target_duration)
        if duration_seconds > 0:
            total_words = int(duration_seconds * 2.5) # ~150 WPM
            if duration_seconds <= 45:
                num_segments = 2
                style_desc = (
                    "Extremely short and punchy. All segments MUST be 'short' size. "
                    "Avoid pleasantries or chit-chat. Get straight to the point. "
                    "Each dialogue turn must be brief (around 10-20 words)."
                )
            elif duration_seconds <= 180:
                num_segments = 3
                style_desc = (
                    "Concise. Segments should be 'short' or 'medium' size. "
                    "Each dialogue turn should be around 20-35 words."
                )
            elif duration_seconds <= 600:
                num_segments = 4
                style_desc = (
                    "Standard length. Segments should be 'medium' or 'long' size. "
                    "Provide clear explanations. Each dialogue turn should be around 30-50 words."
                )
            else:
                num_segments = 5
                style_desc = (
                    "Detailed, long-form podcast. Deep-dive explanations and back-and-forth discussion. "
                    "Each dialogue turn should be descriptive (around 45-60 words) to ensure target duration is met."
                )
            
            # Apply override to episode profile object
            episode_profile.num_segments = num_segments
            
            # Append target duration instructions to briefing
            briefing += (
                f"\n\n[DURATION CONSTRAINT] "
                f"Target duration is {input_data.target_duration} (~{duration_seconds} seconds). "
                f"The total word budget across the entire podcast is approximately {total_words} words. "
                f"Narrative style: {style_desc}"
            )

        # Check if an episode already exists for this command to avoid duplicates on retries
        command_id = input_data.execution_context.command_id if input_data.execution_context else None
        episode = None
        episode_id = None
        if command_id:
            cmd_raw_id = str(command_id).split(":")[-1]
            episode_id = f"episode:{cmd_raw_id}"
            
            existing = await repo_query(
                "SELECT * FROM episode WHERE command = $command_id",
                {"command_id": ensure_record_id(command_id)}
            )
            if existing:
                episode = PodcastEpisode(**existing[0])
                logger.info(f"Found existing episode record: {episode.id} for command {command_id}, reusing it.")
                # Update fields
                episode.name = input_data.episode_name
                episode.episode_profile = full_model_dump(episode_profile.model_dump())
                episode.speaker_profile = full_model_dump(speaker_profile.model_dump())
                episode.briefing = briefing
                episode.content = input_data.content
                episode.notebook_id = input_data.notebook_id
                episode.briefing_suffix = input_data.briefing_suffix
                # Reset audio/transcript/outline if re-running
                episode.audio_file = None
                episode.transcript = None
                episode.outline = None

        if not episode:
            episode_data = {
                "name": input_data.episode_name,
                "episode_profile": full_model_dump(episode_profile.model_dump()),
                "speaker_profile": full_model_dump(speaker_profile.model_dump()),
                "command": ensure_record_id(command_id) if command_id else None,
                "briefing": briefing,
                "content": input_data.content,
                "audio_file": None,
                "transcript": None,
                "outline": None,
                "notebook_id": input_data.notebook_id,
                "briefing_suffix": input_data.briefing_suffix,
            }
            if episode_id:
                episode_data["created"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                episode_data["updated"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                try:
                    await repo_query(
                        f"CREATE {episode_id} CONTENT $data",
                        {"data": episode_data}
                    )
                    episode = await PodcastEpisode.get(episode_id)
                except Exception as create_err:
                    logger.error(f"Failed to create episode record with ID {episode_id} (might be concurrent duplicate): {create_err}")
                    raise RuntimeError(f"Duplicate episode creation aborted for command {command_id}: {create_err}") from create_err
            else:
                episode = PodcastEpisode(**episode_data)
                await episode.save()
        else:
            await episode.save()

        # Update episode profile dict in the dictionary that gets configured
        if episode_profile.name in episode_profiles_dict:
            episode_profiles_dict[episode_profile.name]["num_segments"] = num_segments

        configure("speakers_config", {"profiles": speaker_profiles_dict})
        configure("episode_config", {"profiles": episode_profiles_dict})

        logger.info("Configured podcast-creator with episode and speaker profiles")

        logger.info(f"Generated briefing (length: {len(briefing)} chars)")

        # 7. Create output directory using UUID for filesystem-safe paths
        episode_dir_name, output_dir = build_episode_output_dir(DATA_FOLDER)
        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Created output directory: {output_dir}")

        # 8. Generate podcast using podcast-creator
        logger.info("Starting podcast generation with podcast-creator...")

        result = await create_podcast(
            content=input_data.content,
            briefing=briefing,
            episode_name=episode_dir_name,
            output_dir=str(output_dir),
            speaker_config=speaker_profile.name,
            episode_profile=episode_profile.name,
            num_segments=num_segments,
        )

        episode.audio_file = (
            str(result.get("final_output_file_path")) if result else None
        )
        episode.transcript = {
            "transcript": full_model_dump(result["transcript"]) if result else None
        }
        episode.outline = full_model_dump(result["outline"]) if result else None
        await episode.save()

        processing_time = time.time() - start_time
        logger.info(
            f"Successfully generated podcast episode: {episode.id} in {processing_time:.2f}s"
        )

        return PodcastGenerationOutput(
            success=True,
            episode_id=str(episode.id),
            audio_file_path=str(result.get("final_output_file_path"))
            if result
            else None,
            transcript={"transcript": full_model_dump(result["transcript"])}
            if result.get("transcript")
            else None,
            outline=full_model_dump(result["outline"])
            if result.get("outline")
            else None,
            processing_time=processing_time,
        )

    except ValueError:
        raise

    except Exception as e:
        logger.error(f"Podcast generation failed: {e}")
        logger.exception(e)

        error_msg = str(e)
        if "Invalid json output" in error_msg or "Expecting value" in error_msg:
            error_msg += (
                "\n\nNOTE: This error commonly occurs with GPT-5 models that use extended thinking. "
                "The model may be putting all output inside <think> tags, leaving nothing to parse. "
                "Try using gpt-4o, gpt-4o-mini, or gpt-4-turbo instead in your episode profile."
            )

        raise RuntimeError(error_msg) from e
