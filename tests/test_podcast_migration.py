"""Integration test for podcast profile migration repair.

Verifies that migrate_podcast_profiles:
1. Deletes leftover '__verify_test_' speaker profiles.
2. Repairs stale/broken voice model references (restoring default fallbacks).
3. Clears broken per-speaker overrides.
4. Restores broken language models on episode profiles using available database fallbacks.
"""

import asyncio
import os
import pytest

# Ensure environment variables are loaded
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

from open_notebook.database.repository import repo_create, repo_delete, repo_query
from open_notebook.podcasts.models import SpeakerProfile, EpisodeProfile
from open_notebook.podcasts.migration import migrate_podcast_profiles


@pytest.mark.asyncio
async def test_podcast_profile_migration_repair():
    # 1. Clean any pre-existing test artifacts from DB
    await repo_query("DELETE speaker_profile WHERE name = 'test_stale_profile';")
    await repo_query("DELETE speaker_profile WHERE name = '__verify_test_temp_999';")
    await repo_query("DELETE episode_profile WHERE name = 'test_stale_episode';")
    await repo_query("DELETE model WHERE id IN [model:temp_stale_model_1, model:temp_stale_model_2, model:temp_stale_model_3];")

    # 2. Create temporary model records so SurrealDB allows the initial record link insertion
    await repo_create(
        "model",
        {
            "id": "model:temp_stale_model_1",
            "name": "temp_stale_model_1",
            "provider": "openai",
            "type": "text_to_speech",
            "description": "Temp model for test",
        },
    )
    await repo_create(
        "model",
        {
            "id": "model:temp_stale_model_2",
            "name": "temp_stale_model_2",
            "provider": "openai",
            "type": "text_to_speech",
            "description": "Temp override model for test",
        },
    )
    await repo_create(
        "model",
        {
            "id": "model:temp_stale_model_3",
            "name": "temp_stale_model_3",
            "provider": "openrouter",
            "type": "language",
            "description": "Temp language model for test",
        },
    )

    # Create speaker profile pointing to the temp model records using the model class
    sp = SpeakerProfile(
        name="test_stale_profile",
        description="Profile pointing to stale voice model",
        voice_model="model:temp_stale_model_1",
        tts_provider="openai",
        tts_model="gpt-4o-mini-tts",
        speakers=[
            {
                "name": "Speaker One",
                "voice_id": "alloy",
                "backstory": "Test",
                "personality": "Test",
                "voice_model": "model:temp_stale_model_2",
            }
        ],
    )
    await sp.save()
    sp_stale_id = sp.id

    # Create a leftover __verify_test_ profile that should be purged
    sp_verify = SpeakerProfile(
        name="__verify_test_temp_999",
        description="Purge me",
        speakers=[
            {
                "name": "Verify Speaker",
                "voice_id": "alloy",
                "backstory": "Test",
                "personality": "Test",
            }
        ],
    )
    await sp_verify.save()
    sp_verify_id = sp_verify.id

    # Create an episode profile pointing to the temp language model record using the model class
    ep = EpisodeProfile(
        name="test_stale_episode",
        description="Episode pointing to stale outline model",
        speaker_config="test_stale_profile",
        outline_provider="openrouter",
        outline_model="gpt-4o-mini",
        transcript_provider="openrouter",
        transcript_model="gpt-4o-mini",
        outline_llm="model:temp_stale_model_3",
        transcript_llm="model:temp_stale_model_3",
        default_briefing="Briefing",
        num_segments=5,
    )
    await ep.save()
    ep_stale_id = ep.id

    # 3. Now delete the temporary model records from the database
    # This makes the references on the profiles "stale/broken"
    await repo_delete("model:temp_stale_model_1")
    await repo_delete("model:temp_stale_model_2")
    await repo_delete("model:temp_stale_model_3")

    try:
        # Run migration repair
        await migrate_podcast_profiles()

        # 4. Assertions
        # Check that __verify_test_temp_999 was purged
        purged = await repo_query(
            "SELECT * FROM speaker_profile WHERE name = '__verify_test_temp_999'"
        )
        assert len(purged) == 0, "Leftover test profile was not purged"

        # Check that the stale speaker profile voice_model was repaired to the fallback
        repaired_sp = await repo_query(
            "SELECT * FROM speaker_profile WHERE name = 'test_stale_profile'"
        )
        assert len(repaired_sp) == 1
        sp_rec = repaired_sp[0]
        assert (
            sp_rec["voice_model"] == "model:openai_tts"
        ), f"Stale voice model not repaired, got: {sp_rec['voice_model']}"
        assert (
            sp_rec["speakers"][0].get("voice_model") is None
        ), "Stale speaker override was not cleared"

        # Check that the stale episode profile language models were repaired to fallbacks
        repaired_ep = await repo_query(
            "SELECT * FROM episode_profile WHERE name = 'test_stale_episode'"
        )
        assert len(repaired_ep) == 1
        ep_rec = repaired_ep[0]
        assert ep_rec["outline_llm"] is not None
        assert ep_rec["outline_llm"].startswith("model:")
        assert ep_rec["outline_llm"] != "model:temp_stale_model_3"
        assert ep_rec["transcript_llm"] is not None
        assert ep_rec["transcript_llm"].startswith("model:")
        assert ep_rec["transcript_llm"] != "model:temp_stale_model_3"

    finally:
        # Cleanup
        await repo_delete(sp_stale_id)
        await repo_delete(sp_verify_id)
        await repo_delete(ep_stale_id)
