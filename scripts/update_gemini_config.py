import json
import os

config_path = os.path.expanduser("~/.gemini/config/config.json")

if os.path.exists(config_path):
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    allow_list = data.get("userSettings", {}).get("globalPermissionGrants", {}).get("allow", [])
    
    new_permissions = [
        "command(docker)",
        "command(docker ps)",
        "command(docker compose)",
        "command(docker compose up)",
        "command(docker compose ps)",
        "command(docker compose logs)",
        "command(docker compose down)",
        "command(docker exec)",
        "command(docker run)",
        "command(docker stop)",
        "command(docker rm)",
        "command(docker info)",
        "read_file(/var/run/docker.sock)",
        "write_file(/var/run/docker.sock)",
        "read_file(/Users/jimmcknney/.docker/run/docker.sock)",
        "write_file(/Users/jimmcknney/.docker/run/docker.sock)",
        "mcp(MCP_DOCKER/*)"
    ]
    
    added_count = 0
    for perm in new_permissions:
        if perm not in allow_list:
            allow_list.append(perm)
            added_count += 1
            
    data["userSettings"]["globalPermissionGrants"]["allow"] = allow_list
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print(f"Successfully added {added_count} Docker permission grants to {config_path}")
else:
    print(f"Config path not found: {config_path}")
