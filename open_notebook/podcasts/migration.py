"""
Data migration for podcast profiles: maps legacy provider/model strings
to Model registry record IDs.

Runs on API startup after SQL migrations. Idempotent - skips profiles
that already have the new fields populated and valid.
"""

from loguru import logger

from open_notebook.database.repository import ensure_record_id, repo_query, repo_update


async def _find_model_record(
    provider: str, model_name: str, model_type: str
) -> str | None:
    """Find an existing Model record matching provider + name + type."""
    results = await repo_query(
        "SELECT * FROM model WHERE provider = $provider AND name = $name AND type = $type",
        {"provider": provider, "name": model_name, "type": model_type},
    )
    if results:
        return str(results[0]["id"])
    return None


async def _find_or_create_model(
    provider: str, model_name: str, model_type: str
) -> str | None:
    """Find existing Model record or auto-create one linked to provider credential."""
    # Try exact match first
    model_id = await _find_model_record(provider, model_name, model_type)
    if model_id:
        return model_id

    # Try to find a credential for this provider and auto-create the model
    from open_notebook.domain.credential import Credential

    credentials = await Credential.get_by_provider(provider)
    if not credentials:
        logger.warning(
            f"No credential found for provider '{provider}'. "
            f"Cannot auto-create model '{model_name}'. Profile needs manual migration."
        )
        return None

    # Use the first credential for the provider
    credential = credentials[0]
    from open_notebook.ai.models import Model

    model = Model(
        name=model_name,
        provider=provider,
        type=model_type,
        credential=str(credential.id),
    )
    await model.save()
    logger.info(
        f"Auto-created model '{model_name}' ({model_type}) "
        f"linked to credential '{credential.name}'"
    )
    return str(model.id)


async def _model_exists(model_id: str | None) -> bool:
    """Verify if a model ID actually exists in the model table."""
    if not model_id:
        return False
    try:
        results = await repo_query(
            "SELECT id FROM $model_id",
            {"model_id": ensure_record_id(model_id)}
        )
        return bool(results)
    except Exception:
        return False


async def _find_fallback_language_model(provider: str | None = None) -> str | None:
    """Find any available language model as a fallback."""
    if provider:
        results = await repo_query(
            "SELECT id FROM model WHERE provider = $provider AND type = 'language' LIMIT 1",
            {"provider": provider}
        )
        if results:
            return str(results[0]["id"])

    results = await repo_query(
        "SELECT id FROM model WHERE type = 'language' LIMIT 1"
    )
    if results:
        return str(results[0]["id"])
    return None


def _get_fallback_tts_model_id(provider: str | None) -> str:
    """Get the pre-seeded default model ID for a TTS provider."""
    mapping = {
        "openai": "model:openai_tts",
        "kokoro": "model:kokoro",
        "elevenlabs": "model:elevenlabs_tts",
        "deepgram": "model:deepgram_tts"
    }
    return mapping.get(str(provider).lower(), "model:openai_tts")


async def migrate_podcast_profiles() -> None:
    """Migrate episode and speaker profiles from legacy strings to Model record IDs.

    Idempotent: skips profiles where new fields are already populated and valid.
    """
    logger.info("Starting podcast profile data migration...")

    ep_migrated = 0
    ep_skipped = 0
    ep_failed = 0

    # Migrate EpisodeProfiles
    episode_profiles = await repo_query("SELECT * FROM episode_profile")
    for raw in episode_profiles:
        profile_name = raw.get("name", raw.get("id", "unknown"))
        try:
            outline_llm = raw.get("outline_llm")
            transcript_llm = raw.get("transcript_llm")

            # Check if referenced models actually exist
            if outline_llm and not await _model_exists(outline_llm):
                logger.warning(
                    f"Episode profile '{profile_name}' references missing outline model '{outline_llm}'. Resetting for repair."
                )
                outline_llm = None

            if transcript_llm and not await _model_exists(transcript_llm):
                logger.warning(
                    f"Episode profile '{profile_name}' references missing transcript model '{transcript_llm}'. Resetting for repair."
                )
                transcript_llm = None

            needs_outline = not outline_llm
            needs_transcript = not transcript_llm

            if not needs_outline and not needs_transcript:
                ep_skipped += 1
                continue

            updates = {}

            if needs_outline:
                outline_provider = raw.get("outline_provider") or "openrouter"
                outline_model = raw.get("outline_model")
                model_id = None
                if outline_provider and outline_model:
                    model_id = await _find_or_create_model(
                        outline_provider, outline_model, "language"
                    )
                if not model_id:
                    model_id = await _find_fallback_language_model(outline_provider)
                
                if model_id:
                    updates["outline_llm"] = ensure_record_id(model_id)

            if needs_transcript:
                transcript_provider = raw.get("transcript_provider") or "openrouter"
                transcript_model = raw.get("transcript_model")
                model_id = None
                if transcript_provider and transcript_model:
                    model_id = await _find_or_create_model(
                        transcript_provider, transcript_model, "language"
                    )
                if not model_id:
                    model_id = await _find_fallback_language_model(transcript_provider)
                
                if model_id:
                    updates["transcript_llm"] = ensure_record_id(model_id)

            if updates:
                await repo_update("episode_profile", str(raw["id"]), updates)
                ep_migrated += 1
                logger.info(
                    f"Migrated/Repaired episode profile '{profile_name}': {list(updates.keys())}"
                )
            else:
                ep_failed += 1
                logger.warning(
                    f"Could not migrate episode profile '{profile_name}': "
                    "no matching models found"
                )

        except Exception as e:
            ep_failed += 1
            logger.error(f"Failed to migrate episode profile '{profile_name}': {e}")

    # Migrate SpeakerProfiles
    sp_migrated = 0
    sp_skipped = 0
    sp_failed = 0

    speaker_profiles = await repo_query("SELECT * FROM speaker_profile")
    for raw in speaker_profiles:
        profile_name = raw.get("name", raw.get("id", "unknown"))

        # Purge test leftovers
        if profile_name.startswith("__verify_test_"):
            from open_notebook.database.repository import repo_delete
            await repo_delete(raw["id"])
            logger.info(f"Deleted leftover test speaker profile: {profile_name}")
            continue

        try:
            voice_model = raw.get("voice_model")
            speakers = raw.get("speakers", [])
            speakers_updated = False

            # Clean speaker-level overrides
            new_speakers = []
            for speaker in speakers:
                sp_voice = speaker.get("voice_model")
                if sp_voice:
                    if not await _model_exists(sp_voice):
                        logger.warning(
                            f"Speaker '{speaker.get('name')}' in profile '{profile_name}' "
                            f"references missing voice model '{sp_voice}'. Clearing override."
                        )
                        speaker["voice_model"] = None
                        speakers_updated = True
                    else:
                        speaker["voice_model"] = ensure_record_id(sp_voice)
                new_speakers.append(speaker)

            # Check profile-level voice_model
            if voice_model and not await _model_exists(voice_model):
                logger.warning(
                    f"Speaker profile '{profile_name}' references missing voice model '{voice_model}'. Resetting for repair."
                )
                voice_model = None

            needs_voice = not voice_model

            if not needs_voice:
                if speakers_updated:
                    await repo_update(
                        "speaker_profile",
                        str(raw["id"]),
                        {"speakers": new_speakers},
                    )
                    sp_migrated += 1
                    logger.info(f"Cleaned speaker-level overrides for speaker profile '{profile_name}'")
                else:
                    sp_skipped += 1
                continue

            tts_provider = raw.get("tts_provider")
            tts_model = raw.get("tts_model")

            if not tts_provider or not tts_model:
                # Profile name fallback mapping for pre-seeded default profiles
                defaults = {
                    "tech_experts": ("openai", "tts-1"),
                    "solo_expert": ("openai", "tts-1"),
                    "business_panel": ("openai", "tts-1"),
                    "test": ("kokoro", "kokoro"),
                    "Tes": ("deepgram", "aura-2-thalia-en")
                }
                if profile_name in defaults:
                    tts_provider, tts_model = defaults[profile_name]
                else:
                    tts_provider = "kokoro"
                    tts_model = "kokoro"

            model_id = await _find_or_create_model(
                tts_provider, tts_model, "text_to_speech"
            )
            if not model_id:
                # Direct fallback to pre-seeded default model record
                model_id = _get_fallback_tts_model_id(tts_provider)
                logger.info(
                    f"No credentials to create model for '{tts_provider}/{tts_model}'. "
                    f"Falling back to default model record: {model_id}"
                )

            if model_id:
                updates = {
                    "voice_model": ensure_record_id(model_id),
                    "speakers": new_speakers,
                }
                await repo_update(
                    "speaker_profile",
                    str(raw["id"]),
                    updates,
                )
                sp_migrated += 1
                logger.info(f"Migrated/Repaired speaker profile '{profile_name}'")
            else:
                sp_failed += 1
                logger.warning(
                    f"Could not migrate speaker profile '{profile_name}': "
                    "no matching model found"
                )

        except Exception as e:
            sp_failed += 1
            logger.error(f"Failed to migrate speaker profile '{profile_name}': {e}")

    logger.info(
        f"Podcast profile migration complete. "
        f"Episodes: {ep_migrated} migrated, {ep_skipped} skipped, {ep_failed} failed. "
        f"Speakers: {sp_migrated} migrated, {sp_skipped} skipped, {sp_failed} failed."
    )


