#!/usr/bin/env python3
"""
Sanitizes ~/.gemini/config/config.json to ensure Docker terminal commands are properly
allowed and persistent across Antigravity IDE restarts, while removing invalid socket file paths
that trigger security sanitization purges on boot.
"""

import json
import shutil
from pathlib import Path

CONFIG_PATH = Path.home() / ".gemini" / "config" / "config.json"
BACKUP_PATH = Path.home() / ".gemini" / "config" / "config.json.bak"


def sanitize_config():
    if not CONFIG_PATH.exists():
        print(f"Error: Config file not found at {CONFIG_PATH}")
        return False

    # 1. Create backup
    shutil.copy2(CONFIG_PATH, BACKUP_PATH)
    print(f"✅ Created backup at {BACKUP_PATH}")

    # 2. Load JSON
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    allow_list = data.get("userSettings", {}).get("globalPermissionGrants", {}).get("allow", [])

    # 3. Filter out invalid socket file entries that trigger startup security purges
    purged_items = []
    clean_allow_list = []

    for item in allow_list:
        if "docker.sock" in item:
            purged_items.append(item)
        else:
            clean_allow_list.append(item)

    # 4. Standard Docker command set to guarantee comprehensive coverage
    essential_docker_commands = [
        "command(docker)",
        "command(docker ps)",
        "command(docker compose)",
        "command(docker compose up)",
        "command(docker compose ps)",
        "command(docker compose logs)",
        "command(docker compose down)",
        "command(docker compose config)",
        "command(docker exec)",
        "command(docker run)",
        "command(docker stop)",
        "command(docker rm)",
        "command(docker info)",
        "command(docker restart)",
        "command(docker build)",
        "command(docker logs)",
        "command(docker network)",
        "command(docker inspect)",
        "command(docker mcp)",
        "mcp(MCP_DOCKER/*)",
    ]

    for cmd in essential_docker_commands:
        if cmd not in clean_allow_list:
            clean_allow_list.append(cmd)

    # 5. Deduplicate preserving order
    seen = set()
    deduped_allow_list = []
    for item in clean_allow_list:
        if item not in seen:
            seen.add(item)
            deduped_allow_list.append(item)

    # Update data structure
    data["userSettings"]["globalPermissionGrants"]["allow"] = deduped_allow_list

    # 6. Save back to config.json
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Sanitized {CONFIG_PATH}:")
    print(f"   - Removed {len(purged_items)} invalid socket paths: {purged_items}")
    print(f"   - Preserved {len(deduped_allow_list)} clean permission grants.")
    return True


if __name__ == "__main__":
    sanitize_config()
