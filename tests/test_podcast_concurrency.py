import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

from api.routers.podcasts import (
    list_podcast_episodes,
    get_podcast_episode,
    delete_podcast_episode,
    retry_podcast_episode,
)
from open_notebook.database.repository import repo_query, repo_create, repo_delete
from open_notebook.podcasts.models import PodcastEpisode, EpisodeProfile, SpeakerProfile
from commands.podcast_commands import generate_podcast_command, PodcastGenerationInput

@pytest.mark.anyio
async def test_list_podcast_episodes_synthesizes_placeholder():
    # Insert a dummy active command
    cmd_data = {
        "app": "open_notebook",
        "name": "generate_podcast",
        "status": "running",
        "args": {
            "episode_name": "Test Placeholder Podcast",
            "episode_profile": "solo_expert",
            "speaker_profile": "solo_expert",
            "content": "some content"
        }
    }
    created_cmd = await repo_create("command", cmd_data)
    cmd_id = created_cmd[0]["id"]
    
    try:
        # Call list_podcast_episodes
        episodes = await list_podcast_episodes()
        
        # Verify that our placeholder is present in the list
        placeholder = next((ep for ep in episodes if ep.id == cmd_id), None)
        assert placeholder is not None
        assert placeholder.name == "Test Placeholder Podcast"
        assert placeholder.job_status == "running"
        assert placeholder.outline is None
        assert placeholder.audio_file is None
    finally:
        # Cleanup
        await repo_delete(cmd_id)

@pytest.mark.anyio
async def test_placeholder_endpoints_routing():
    # Insert a dummy active command
    cmd_data = {
        "app": "open_notebook",
        "name": "generate_podcast",
        "status": "failed",
        "args": {
            "episode_name": "Failed Test Placeholder",
            "episode_profile": "solo_expert",
            "speaker_profile": "solo_expert",
            "content": "some content"
        }
    }
    created_cmd = await repo_create("command", cmd_data)
    cmd_id = created_cmd[0]["id"]
    
    try:
        # Test get_podcast_episode
        episode_response = await get_podcast_episode(cmd_id)
        assert episode_response.id == cmd_id
        assert episode_response.name == "Failed Test Placeholder"
        assert episode_response.job_status == "failed"
        
        # Mock PodcastService.submit_generation_job for retry test
        with patch("api.podcast_service.PodcastService.submit_generation_job", new_callable=AsyncMock) as mock_submit:
            mock_submit.return_value = "command:newjob12345"
            
            # Test retry_podcast_episode
            retry_res = await retry_podcast_episode(cmd_id)
            assert retry_res["job_id"] == "command:newjob12345"
            mock_submit.assert_called_once()
            
            # Check that the failed command was deleted as part of the retry
            check_deleted = await repo_query("SELECT * FROM command WHERE id = $id", {"id": cmd_id})
            assert len(check_deleted) == 0
            
    finally:
        # Cleanup
        await repo_delete(cmd_id)
        
    # Test delete_podcast_episode
    cmd_data_del = {
        "app": "open_notebook",
        "name": "generate_podcast",
        "status": "new",
        "args": {"episode_name": "To Delete"}
    }
    created_cmd_del = await repo_create("command", cmd_data_del)
    cmd_id_del = created_cmd_del[0]["id"]
    
    await delete_podcast_episode(cmd_id_del)
    # Check that it was deleted
    check_deleted = await repo_query("SELECT * FROM command WHERE id = $id", {"id": cmd_id_del})
    assert len(check_deleted) == 0

@pytest.mark.anyio
async def test_generate_podcast_command_atomic_concurrency():
    from surreal_commands.core.types import ExecutionContext
    from datetime import datetime
    
    command_id = "command:testconcurrency123"
    ctx = ExecutionContext(
        command_id=command_id,
        execution_started_at=datetime.now(),
        app_name="open_notebook",
        command_name="generate_podcast"
    )
    
    input_data = PodcastGenerationInput(
        episode_profile="solo_expert",
        speaker_profile="solo_expert",
        episode_name="Concurrency Test Episode",
        content="Test content for atomic locking.",
        execution_context=ctx
    )
    
    with patch("commands.podcast_commands.configure") as mock_configure, \
         patch("commands.podcast_commands.create_podcast", new_callable=AsyncMock) as mock_create:
         
        mock_create.return_value = {
            "final_output_file_path": "/tmp/dummy.mp3",
            "transcript": [],
            "outline": {}
        }
        
        await repo_delete("episode:testconcurrency123")
        
        try:
            res1 = await generate_podcast_command(input_data)
            assert res1.success is True
            assert res1.episode_id == "episode:testconcurrency123"
            
            # For the second call, patch repo_query to return [] when checking for existing episode records,
            # simulating a concurrent thread that doesn't see the record and proceeds to CREATE.
            original_repo_query = repo_query
            async def mock_repo_query(query, vars=None):
                if "SELECT * FROM episode WHERE command =" in query:
                    return []
                return await original_repo_query(query, vars)

            with patch("commands.podcast_commands.repo_query", side_effect=mock_repo_query):
                with pytest.raises(RuntimeError) as exc_info:
                    await generate_podcast_command(input_data)
                assert "Duplicate episode creation aborted" in str(exc_info.value)
            
        finally:
            await repo_delete("episode:testconcurrency123")
