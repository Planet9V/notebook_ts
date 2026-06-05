import json
import os
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from loguru import logger

router = APIRouter()

# Default directory where active MCP tool schemas are registered
DEFAULT_MCP_DIR = os.path.expanduser("~/.gemini/antigravity/mcp")


def _discover_mcp_servers() -> List[Dict[str, Any]]:
    """Scan the registered MCP directories and extract tool schemas statically."""
    mcp_dir = os.environ.get("MCP_DIR", DEFAULT_MCP_DIR)
    servers = []

    if not os.path.exists(mcp_dir):
        logger.warning(f"MCP registry directory does not exist: {mcp_dir}")
        return servers

    try:
        for item_name in os.listdir(mcp_dir):
            item_path = os.path.join(mcp_dir, item_name)
            if not os.path.isdir(item_path):
                continue

            # Standardize server name formatting
            server_name = item_name.replace("_", "-")
            tools = []

            # Discover all tool schemas inside this server's directory
            for filename in os.listdir(item_path):
                if not filename.endswith(".json"):
                    continue

                tool_name = filename[:-5]  # Strip '.json'
                schema_path = os.path.join(item_path, filename)

                try:
                    with open(schema_path, "r", encoding="utf-8") as f:
                        schema = json.load(f)

                    # Extract details from schema structure
                    desc = schema.get("description", "No description available")
                    parameters = schema.get("parameters", {"type": "object", "properties": {}})

                    tools.append({
                        "name": tool_name,
                        "description": desc,
                        "input_schema": parameters,
                    })
                except Exception as e:
                    logger.error(f"Failed to parse tool schema {schema_path}: {str(e)}")

            # Sort tools by name
            tools.sort(key=lambda t: t["name"].lower())

            servers.append({
                "server_name": server_name,
                "tools": tools,
                "status": "connected" if tools else "inactive",
            })
    except Exception as e:
        logger.error(f"Error scanning MCP registry: {str(e)}")

    # Sort servers by name
    servers.sort(key=lambda s: s["server_name"].lower())
    return servers


@router.get("/mcp", response_model=List[Dict[str, Any]])
async def list_mcp_servers():
    """Discover all installed MCP servers, connection statuses, and tool specifications."""
    try:
        servers = _discover_mcp_servers()
        return servers
    except Exception as e:
        logger.error(f"Error fetching MCP servers status: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching MCP servers status: {str(e)}"
        )
