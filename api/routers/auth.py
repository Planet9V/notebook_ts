from typing import List
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import UserResponse, UserCreate, UserUpdate
from open_notebook.database.repository import repo_query, repo_delete, ensure_record_id
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
                id=str(u["id"]),
                username=u["username"],
                email=u.get("email"),
                first_name=u.get("first_name"),
                last_name=u.get("last_name"),
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


@router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate):
    """Create a new user."""
    try:
        user_id = f"user:{str(uuid.uuid4())}"
        user_record = {
            "username": data.username,
            "email": data.email,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "role": data.role,
            "organization": ensure_record_id(data.organization) if data.organization else None,
            "created": datetime.now().isoformat()
        }
        await repo_query(
            "CREATE type::thing('user', $id) CONTENT $data;",
            {"id": user_id.split(":")[-1], "data": user_record}
        )
        return UserResponse(id=user_id, **data.model_dump())
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate):
    """Update an existing user."""
    try:
        if ":" not in user_id:
            user_id = f"user:{user_id}"
        rid = ensure_record_id(user_id)
        existing = await repo_query("SELECT * FROM user WHERE id = $id", {"id": rid})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        updates = data.model_dump(exclude_unset=True)
        if "organization" in updates and updates["organization"]:
            updates["organization"] = ensure_record_id(updates["organization"])
            
        await repo_query(
            "UPDATE $id MERGE $updates;",
            {"id": rid, "updates": updates}
        )
        updated_user = await repo_query("SELECT * FROM user WHERE id = $id", {"id": rid})
        u = updated_user[0]
        return UserResponse(
            id=str(u["id"]),
            username=u["username"],
            email=u.get("email"),
            first_name=u.get("first_name"),
            last_name=u.get("last_name"),
            role=u.get("role"),
            organization=str(u.get("organization")) if u.get("organization") else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user."""
    try:
        if ":" not in user_id:
            user_id = f"user:{user_id}"
        await repo_delete(user_id)
        return {"message": "User deleted successfully", "id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))