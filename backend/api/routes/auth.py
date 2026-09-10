"""Authentication API Router for HashScope Backend.

Exposes endpoints for admin authentication login and session verification.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from backend.api.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    TokenVerifyResponse,
)
from backend.core.auth import (
    verify_admin_password,
    create_access_token,
    get_current_admin,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/admin-login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    """Authenticates admin user against ADMIN_PASSWORD env variable.
    
    Returns a signed JWT access token on success.
    """
    if not verify_admin_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"role": "admin"})
    return AdminLoginResponse(token=token, token_type="bearer")


@router.get("/verify", response_model=TokenVerifyResponse)
async def verify_token(current_admin: dict = Depends(get_current_admin)):
    """Verifies that an existing admin token is valid and active."""
    return TokenVerifyResponse(status="authenticated", user="admin")
