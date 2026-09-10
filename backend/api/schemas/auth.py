"""Pydantic schemas for authentication API endpoints."""

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    """Payload for admin login request."""
    password: str = Field(..., description="Admin password to validate")


class AdminLoginResponse(BaseModel):
    """Response containing JWT session token upon successful login."""
    token: str = Field(..., description="Signed JWT access token")
    token_type: str = Field("bearer", description="Token type, always 'bearer'")


class TokenVerifyResponse(BaseModel):
    """Response for token verification check."""
    status: str = Field("authenticated", description="Authentication status")
    user: str = Field("admin", description="Authenticated role")
