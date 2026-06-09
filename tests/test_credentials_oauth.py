"""
Tests for Google OAuth 2.0 Credentials Callbacks.
"""
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

@pytest.fixture
def client():
    from api.main import app
    return TestClient(app)

class TestCredentialsOAuth:
    @pytest.mark.asyncio
    @patch("api.routers.credentials.Credential.get")
    async def test_oauth_callback_error_param(self, mock_get, client):
        """When Google returns an error parameter, return 400 and show failure page."""
        response = client.get("/api/credentials/oauth/callback?error=access_denied")
        assert response.status_code == 400
        assert "Authorization Failed" in response.text
        assert "access_denied" in response.text
        mock_get.assert_not_called()

    @pytest.mark.asyncio
    @patch("api.routers.credentials.Credential.get")
    async def test_oauth_callback_missing_code(self, mock_get, client):
        """When authorization code is missing, return 400."""
        response = client.get("/api/credentials/oauth/callback")
        assert response.status_code == 400
        assert "Missing authorization code" in response.json()["detail"]
        mock_get.assert_not_called()

    @pytest.mark.asyncio
    @patch("api.routers.credentials.Credential.get")
    @patch("httpx.AsyncClient.post")
    async def test_oauth_callback_success(self, mock_post, mock_get, client):
        """When code is provided, exchange it for tokens and persist them successfully."""
        # 1. Setup mock credential
        mock_cred = AsyncMock()
        mock_cred.client_id = "mock_client_id"
        mock_cred.client_secret = SecretStr("mock_secret")
        mock_cred.redirect_uri = "http://localhost:5055/api/credentials/oauth/callback"
        mock_cred.api_key = None
        mock_cred.refresh_token = None
        mock_get.return_value = mock_cred

        # 2. Mock token exchange response from Google
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600
        }
        mock_post.return_value = mock_response

        # 3. Call callback endpoint
        response = client.get("/api/credentials/oauth/callback?code=mock_auth_code")

        # 4. Assertions
        assert response.status_code == 200
        assert "Connection Successful!" in response.text
        
        # Verify tokens are saved to the credential
        assert mock_cred.api_key.get_secret_value() == "new_access_token"
        assert mock_cred.refresh_token.get_secret_value() == "new_refresh_token"
        mock_cred.save.assert_awaited_once()
