import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone
from open_notebook.tasks.publication_worker import publish_due_posts

@pytest.mark.asyncio
@patch("open_notebook.tasks.publication_worker.repo_query")
@patch("open_notebook.tasks.publication_worker.repo_update")
@patch("open_notebook.domain.credential.Credential.get_by_provider")
async def test_publish_due_posts_twitter_success(mock_get_creds, mock_repo_update, mock_repo_query):
    """Test that a due Twitter post publishes successfully with real credentials."""
    
    # 1. Mock due posts returned from repo_query
    past_time = datetime.now(timezone.utc)
    mock_repo_query.side_effect = [
        [
            {
                "id": "scheduled_post:1",
                "channel": "twitter",
                "title": "Test Tweet",
                "content": "Real Tweet content",
                "scheduled_time": past_time,
                "status": "queued"
            }
        ]
    ]

    # 2. Mock credentials returning real API key (not sandbox)
    mock_cred = MagicMock()
    mock_cred.api_key.get_secret_value.return_value = "real_twitter_api_key_123"
    mock_get_creds.return_value = [mock_cred]

    # 3. Mock httpx POST request response
    mock_response = MagicMock()
    mock_response.status_code = 201
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
        await publish_due_posts()
        
        # Verify HTTP post was triggered with correct URL, authorization header, and body
        mock_post.assert_called_once_with(
            "https://api.twitter.com/2/tweets",
            headers={
                "Authorization": "Bearer real_twitter_api_key_123",
                "Content-Type": "application/json"
            },
            json={"text": "Real Tweet content"}
        )

        # Verify post status was updated to published in DB
        mock_repo_update.assert_called_once_with(
            "scheduled_post",
            "scheduled_post:1",
            {
                "status": "published",
                "error_message": None,
                "updated_at": mock_repo_update.call_args[0][2]["updated_at"]
            }
        )

@pytest.mark.asyncio
@patch("open_notebook.tasks.publication_worker.repo_query")
@patch("open_notebook.tasks.publication_worker.repo_update")
@patch("open_notebook.domain.credential.Credential.get_by_provider")
async def test_publish_due_posts_linkedin_success(mock_get_creds, mock_repo_update, mock_repo_query):
    """Test that a due LinkedIn post resolves profile URN and shares content successfully."""
    
    # 1. Mock due posts
    past_time = datetime.now(timezone.utc)
    mock_repo_query.side_effect = [
        [
            {
                "id": "scheduled_post:2",
                "channel": "linkedin",
                "title": "Test LinkedIn Post",
                "content": "LinkedIn Share content",
                "scheduled_time": past_time,
                "status": "queued"
            }
        ]
    ]

    # 2. Mock credentials
    mock_cred = MagicMock()
    mock_cred.api_key.get_secret_value.return_value = "real_linkedin_token_456"
    mock_get_creds.return_value = [mock_cred]

    # 3. Mock profile GET response
    mock_me_resp = MagicMock()
    mock_me_resp.status_code = 200
    mock_me_resp.json.return_value = {"id": "linkedin_user_888"}

    # 4. Mock ugcPosts POST response
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 201

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_me_resp) as mock_get, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_post_resp) as mock_post:
         
        await publish_due_posts()
        
        # Verify user profile retrieval
        mock_get.assert_called_once_with(
            "https://api.linkedin.com/v2/me",
            headers={"Authorization": "Bearer real_linkedin_token_456"}
        )

        # Verify post submission with resolved author URN
        mock_post.assert_called_once_with(
            "https://api.linkedin.com/v2/ugcPosts",
            headers={
                "Authorization": "Bearer real_linkedin_token_456",
                "Content-Type": "application/json"
            },
            json={
                "author": "urn:li:person:linkedin_user_888",
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": "LinkedIn Share content"
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
        )

        # Verify status is updated to published
        mock_repo_update.assert_called_once_with(
            "scheduled_post",
            "scheduled_post:2",
            {
                "status": "published",
                "error_message": None,
                "updated_at": mock_repo_update.call_args[0][2]["updated_at"]
            }
        )

@pytest.mark.asyncio
@patch("open_notebook.tasks.publication_worker.repo_query")
@patch("open_notebook.tasks.publication_worker.repo_update")
@patch("open_notebook.domain.credential.Credential.get_by_provider")
async def test_publish_due_posts_failure_handling(mock_get_creds, mock_repo_update, mock_repo_query):
    """Test that API failures raise exceptions and correctly transition status to failed."""
    
    # 1. Mock due Twitter post
    past_time = datetime.now(timezone.utc)
    mock_repo_query.side_effect = [
        [
            {
                "id": "scheduled_post:3",
                "channel": "twitter",
                "title": "Failed Post",
                "content": "This will fail",
                "scheduled_time": past_time,
                "status": "queued"
            }
        ]
    ]

    # 2. Mock credentials
    mock_cred = MagicMock()
    mock_cred.api_key.get_secret_value.return_value = "bad_api_key"
    mock_get_creds.return_value = [mock_cred]

    # 3. Mock failing HTTP response
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized Bearer Token"
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        await publish_due_posts()
        
        # Verify status is marked as failed and error message is saved
        mock_repo_update.assert_called_once_with(
            "scheduled_post",
            "scheduled_post:3",
            {
                "status": "failed",
                "error_message": "Twitter/X API error 401: Unauthorized Bearer Token",
                "updated_at": mock_repo_update.call_args[0][2]["updated_at"]
            }
        )
