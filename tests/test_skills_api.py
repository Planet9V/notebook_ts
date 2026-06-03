"""Tests for the Layer 2 Skills and MCP Registry API endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for main FastAPI app."""
    from api.main import app

    return TestClient(app)


class TestSkillsApi:
    """Comprehensive tests for skills registration and config management."""

    @pytest.mark.asyncio
    @patch("api.routers.skills.SkillRegistry.get_all")
    @patch("api.routers.skills._sync_local_skills")
    async def test_list_skills_sync_and_merge(self, mock_sync, mock_get_all, client):
        """Discovered disk skills are synchronized and merged with SurrealDB configurations."""
        # Setup static disk skills
        mock_sync.return_value = [
            {"name": "gmail-automation", "description": "Send emails via Gmail", "category": "Email"},
            {"name": "linkedin-automation", "description": "Post on LinkedIn", "category": "Social"},
        ]

        # Setup mock database states
        mock_db_skill = AsyncMock()
        mock_db_skill.id = "skill_registry:gmail"
        mock_db_skill.name = "gmail-automation"
        mock_db_skill.description = "Old description"
        mock_db_skill.category = "Email"
        mock_db_skill.enabled = False
        mock_db_skill.config_vars = {"CLIENT_ID": "123"}
        mock_db_skill.created = "2026-06-02T10:00:00"
        mock_db_skill.updated = "2026-06-02T10:00:00"
        mock_db_skill.save = AsyncMock()

        mock_get_all.return_value = [mock_db_skill]

        with patch("api.routers.skills.SkillRegistry.save", new_callable=AsyncMock) as mock_save:
            response = client.get("/api/skills")

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2

            # Confirm database merged the disk description changes
            assert mock_db_skill.description == "Send emails via Gmail"
            mock_db_skill.save.assert_awaited_once()

            # Confirm that the second skill was registered in the database
            gmail = next(x for x in data if x["name"] == "gmail-automation")
            linkedin = next(x for x in data if x["name"] == "linkedin-automation")

            assert gmail["enabled"] is False
            assert gmail["config_vars"] == {"CLIENT_ID": "123"}
            assert linkedin["enabled"] is True
            assert linkedin["config_vars"] == {}

    @pytest.mark.asyncio
    @patch("api.routers.skills.SkillRegistry.get_all")
    @patch("api.routers.skills.SkillRegistry.save", autospec=True)
    async def test_create_custom_skill(self, mock_save, mock_get_all, client):
        """Creating a new custom skill configuration works cleanly."""
        mock_get_all.return_value = []

        new_skill_data = {
            "name": "custom-script",
            "description": "Run arbitrary bash commands",
            "category": "Admin",
            "enabled": True,
            "config_vars": {"TIMEOUT": 30},
        }

        async def mock_save_impl(self_instance, *args, **kwargs):
            self_instance.id = "skill_registry:custom"

        mock_save.side_effect = mock_save_impl

        response = client.post("/api/skills", json=new_skill_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "custom-script"
        assert data["id"] == "skill_registry:custom"
        assert data["config_vars"] == {"TIMEOUT": 30}
        mock_save.assert_called_once()

    @pytest.mark.asyncio
    @patch("api.routers.skills.SkillRegistry.get")
    async def test_update_skill_config_vars(self, mock_get, client):
        """Updating skill configuration variables, toggles, or categories updates SurrealDB."""
        mock_skill = AsyncMock()
        mock_skill.id = "skill_registry:123"
        mock_skill.name = "gmail-automation"
        mock_skill.description = "Send emails"
        mock_skill.category = "Email"
        mock_skill.enabled = True
        mock_skill.config_vars = {"CLIENT_ID": "123"}
        mock_skill.created = "2026-06-02"
        mock_skill.updated = "2026-06-02"
        mock_skill.save = AsyncMock()

        mock_get.return_value = mock_skill

        update_payload = {
            "enabled": False,
            "category": "Messaging",
            "config_vars": {"CLIENT_ID": "123", "CLIENT_SECRET": "abc"},
        }

        response = client.put("/api/skills/skill_registry:123", json=update_payload)

        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
        assert data["category"] == "Messaging"
        assert data["config_vars"] == {"CLIENT_ID": "123", "CLIENT_SECRET": "abc"}
        mock_skill.save.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("api.routers.skills.SkillRegistry.get")
    async def test_delete_custom_skill(self, mock_get, client):
        """Subtracting a custom skill configuration calls delete on the database."""
        mock_skill = AsyncMock()
        mock_skill.id = "skill_registry:123"
        mock_skill.delete = AsyncMock()
        mock_get.return_value = mock_skill

        response = client.delete("/api/skills/skill_registry:123")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Skill configuration deleted successfully"
        mock_skill.delete.assert_awaited_once()


class TestMcpApi:
    """Comprehensive tests for static and dynamic MCP discovery endpoints."""

    @pytest.mark.asyncio
    @patch("api.routers.mcp._discover_mcp_servers")
    async def test_list_mcp_servers(self, mock_discover, client):
        """Registered MCP servers are correctly cataloged and tool parameters returned."""
        mock_discover.return_value = [
            {
                "server_name": "chrome-devtools",
                "status": "connected",
                "tools": [
                    {
                        "name": "click",
                        "description": "Click an element",
                        "input_schema": {"type": "object", "properties": {"selector": {"type": "string"}}},
                    }
                ],
            }
        ]

        response = client.get("/api/mcp")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["server_name"] == "chrome-devtools"
        assert data[0]["tools"][0]["name"] == "click"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
