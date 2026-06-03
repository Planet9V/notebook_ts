from typing import List
from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import UserResponse
from open_notebook.database.repository import repo_query
from open_notebook.utils.encryption import get_secret_from_env

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
async def get_auth_status():
    """
    Check if authentication is enabled.
    Returns whether a password is required to access the API.
    Supports Docker secrets via OPEN_NOTEBOOK_PASSWORD_FILE.
    """
    auth_enabled = bool(get_secret_from_env("OPEN_NOTEBOOK_PASSWORD"))

    return {
        "auth_enabled": auth_enabled,
        "message": "Authentication is required"
        if auth_enabled
        else "Authentication is disabled",
    }


@router.get("/users", response_model=List[UserResponse])
async def list_users():
    """List all users in the system."""
    try:
        users = await repo_query("SELECT * FROM user ORDER BY username;")
        return [
            UserResponse(
                id=u["id"],
                username=u["username"],
                email=u.get("email"),
                role=u.get("role"),
                organization=str(u.get("organization")) if u.get("organization") else None,
            )
            for u in users
        ]
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing users: {str(e)}"
        )