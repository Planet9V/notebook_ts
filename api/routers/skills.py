import os
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    SkillRegistryCreate,
    SkillRegistryResponse,
    SkillRegistryUpdate,
)
from open_notebook.domain.skill import SkillRegistry
from open_notebook.exceptions import InvalidInputError, NotFoundError

router = APIRouter()

# Default directory for dynamically loaded skills
DEFAULT_SKILLS_DIR = "/Users/jimmcknney/.gemini/config/skills/"


def _parse_yaml_frontmatter(content: str) -> Dict[str, str]:
    """Extract YAML frontmatter keys from a SKILL.md file."""
    frontmatter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not frontmatter_match:
        return {}

    yaml_text = frontmatter_match.group(1)
    metadata = {}
    for line in yaml_text.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            metadata[key] = val
    return metadata


def _sync_local_skills() -> List[Dict[str, Any]]:
    """Scan local skill directories and return parsed properties."""
    skills_dir = os.environ.get("SKILLS_DIR", DEFAULT_SKILLS_DIR)
    discovered = []

    if not os.path.exists(skills_dir):
        logger.warning(f"Skills directory does not exist: {skills_dir}")
        return discovered

    try:
        for folder_name in os.listdir(skills_dir):
            folder_path = os.path.join(skills_dir, folder_name)
            if not os.path.isdir(folder_path):
                continue

            skill_file = os.path.join(folder_path, "SKILL.md")
            if not os.path.exists(skill_file):
                continue

            try:
                with open(skill_file, "r", encoding="utf-8") as f:
                    content = f.read()

                meta = _parse_yaml_frontmatter(content)
                name = meta.get("name", folder_name)
                desc = meta.get("description", "No description available")
                category = meta.get("category", "General")

                discovered.append({
                    "name": name,
                    "description": desc,
                    "category": category,
                })
            except Exception as e:
                logger.error(f"Failed to parse skill at {skill_file}: {str(e)}")
    except Exception as e:
        logger.error(f"Error scanning skills directory: {str(e)}")

    return discovered


async def _get_merged_skills() -> List[SkillRegistry]:
    """Sync static local folder skills with database configurations and return merged models."""
    local_skills = _sync_local_skills()
    db_skills = await SkillRegistry.get_all()
    db_map = {s.name: s for s in db_skills}

    merged = []
    for local in local_skills:
        name = local["name"]
        if name in db_map:
            # Sync static metadata changes from disk but preserve database overrides
            db_skill = db_map[name]
            db_skill.description = local["description"]
            db_skill.category = local["category"]
            await db_skill.save()
            merged.append(db_skill)
        else:
            # Auto-register new local skills inside the database
            new_skill = SkillRegistry(
                name=name,
                description=local["description"],
                category=local["category"],
                enabled=True,
                config_vars={},
            )
            await new_skill.save()
            merged.append(new_skill)

    # Also include any custom added skills from the database not present on disk
    local_names = {l["name"] for l in local_skills}
    for db_skill in db_skills:
        if db_skill.name not in local_names:
            merged.append(db_skill)

    return merged


def _skill_to_response(skill: SkillRegistry) -> SkillRegistryResponse:
    """Map SkillRegistry domain model to API response schema."""
    return SkillRegistryResponse(
        id=skill.id or "",
        name=skill.name,
        description=skill.description,
        category=skill.category,
        enabled=skill.enabled,
        config_vars=skill.config_vars,
        created=str(skill.created),
        updated=str(skill.updated),
    )


@router.get("/skills", response_model=List[SkillRegistryResponse])
async def list_skills():
    """List all registered and discovered skills."""
    try:
        skills = await _get_merged_skills()
        # Sort by category and then by name
        skills.sort(key=lambda s: (s.category.lower(), s.name.lower()))
        return [_skill_to_response(s) for s in skills]
    except Exception as e:
        logger.error(f"Error fetching skills registry: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching skills registry: {str(e)}"
        )


@router.post("/skills", response_model=SkillRegistryResponse)
async def create_skill(skill_data: SkillRegistryCreate):
    """Register a new custom skill configuration."""
    try:
        # Check if already exists
        existing = await SkillRegistry.get_all()
        if any(s.name == skill_data.name for s in existing):
            raise HTTPException(
                status_code=400, detail=f"Skill '{skill_data.name}' is already registered."
            )

        new_skill = SkillRegistry(
            name=skill_data.name,
            description=skill_data.description,
            category=skill_data.category,
            enabled=skill_data.enabled if skill_data.enabled is not None else True,
            config_vars=skill_data.config_vars,
        )
        await new_skill.save()
        return _skill_to_response(new_skill)
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating custom skill: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating custom skill: {str(e)}"
        )


@router.get("/skills/{skill_id}", response_model=SkillRegistryResponse)
async def get_skill(skill_id: str):
    """Retrieve detailed settings of a specific skill configuration."""
    try:
        skill = await SkillRegistry.get(skill_id)
        if not skill:
            raise HTTPException(status_code=404, detail="Skill configuration not found")
        return _skill_to_response(skill)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching skill {skill_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching skill: {str(e)}"
        )


@router.put("/skills/{skill_id}", response_model=SkillRegistryResponse)
async def update_skill(skill_id: str, skill_update: SkillRegistryUpdate):
    """Update settings or config variables of a registered skill."""
    try:
        skill = await SkillRegistry.get(skill_id)
        if not skill:
            raise HTTPException(status_code=404, detail="Skill configuration not found")

        # Selectively update provided fields
        if skill_update.description is not None:
            skill.description = skill_update.description
        if skill_update.category is not None:
            skill.category = skill_update.category
        if skill_update.enabled is not None:
            skill.enabled = skill_update.enabled
        if skill_update.config_vars is not None:
            # Merge or overwrite config variables
            skill.config_vars = skill_update.config_vars

        await skill.save()
        return _skill_to_response(skill)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating skill {skill_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating skill: {str(e)}"
        )


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """Delete a custom skill configuration from the registry."""
    try:
        skill = await SkillRegistry.get(skill_id)
        if not skill:
            raise HTTPException(status_code=404, detail="Skill configuration not found")

        await skill.delete()
        return {"message": "Skill configuration deleted successfully"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting skill {skill_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting skill: {str(e)}"
        )
