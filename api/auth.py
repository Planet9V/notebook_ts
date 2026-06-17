from typing import Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from open_notebook.utils.encryption import get_secret_from_env


class PasswordAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to check password authentication for all API requests.
    Always active with default password if OPEN_NOTEBOOK_PASSWORD is not set.
    Supports Docker secrets via OPEN_NOTEBOOK_PASSWORD_FILE.
    """

    def __init__(self, app, excluded_paths: Optional[list] = None):
        super().__init__(app)
        self.password = get_secret_from_env("OPEN_NOTEBOOK_PASSWORD")
        self.excluded_paths = excluded_paths or [
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]

    async def dispatch(self, request: Request, call_next):
        # Skip authentication if no password is set
        if not self.password:
            return await call_next(request)

        # Skip authentication for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)

        # Skip authentication for CORS preflight requests (OPTIONS)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Check authorization header
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing authorization header"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Expected format: "Bearer {password}"
        try:
            scheme, credentials = auth_header.split(" ", 1)
            if scheme.lower() != "bearer":
                raise ValueError("Invalid authentication scheme")
        except ValueError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid authorization header format"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check password
        if credentials != self.password:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid password"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Password is correct, proceed with the request
        response = await call_next(request)
        return response


# Optional: HTTPBearer security scheme for OpenAPI documentation
security = HTTPBearer(auto_error=False)


def check_api_password(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> bool:
    """
    Utility function to check API password.
    Can be used as a dependency in individual routes if needed.
    Supports Docker secrets via OPEN_NOTEBOOK_PASSWORD_FILE.
    Returns True without checking credentials if OPEN_NOTEBOOK_PASSWORD is not configured.
    Raises 401 if credentials are missing or don't match the configured password.
    """
    password = get_secret_from_env("OPEN_NOTEBOOK_PASSWORD")

    # No password configured - skip authentication
    if not password:
        return True

    # No credentials provided
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check password
    if credentials.credentials != password:
        raise HTTPException(
            status_code=401,
            detail="Invalid password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True


class RoleChecker:
    def __init__(self, min_role: str):
        self.min_role = min_role

    async def __call__(self, request: Request) -> str:
        user_role = request.headers.get("X-User-Role")
        user_id = request.headers.get("X-User-Id")

        if not user_role and user_id:
            try:
                from open_notebook.database.repository import repo_query, ensure_record_id
                # User ID could be format user:123 or just 123
                if ":" not in user_id:
                    user_id = f"user:{user_id}"
                rid = ensure_record_id(user_id)
                users = await repo_query("SELECT role FROM user WHERE id = $id", {"id": rid})
                if users and isinstance(users, list):
                    user_role = users[0].get("role")
            except Exception as e:
                logger.error(f"Error checking user role for {user_id}: {e}")

        # Default role if none provided to ensure backward compatibility / ease of use
        if not user_role:
            user_role = "admin"

        role_levels = {
            "admin": 100,
            "editor": 50,
            "developer": 50,
            "viewer": 10,
        }

        user_level = role_levels.get(user_role.lower(), 10)
        min_level = role_levels.get(self.min_role.lower(), 10)

        if user_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Operation forbidden. Minimum role required: {self.min_role}"
            )
        return user_role


def require_role(min_role: str):
    return RoleChecker(min_role)

