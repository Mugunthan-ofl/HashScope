"""Authentication and Access Control Core Module for HashScope Backend.

Manages admin password validation, HMAC-SHA256 JWT session tokens,
and FastAPI security dependency for protecting settings-related routes.
"""

import os
import json
import time
import hmac
import hashlib
import base64
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Read admin secret & JWT signing secret from environment variables
def get_admin_password() -> str:
    return os.getenv("ADMIN_PASSWORD", "admin")

def get_jwt_secret() -> str:
    return os.getenv("JWT_SECRET", "hashscope-admin-secret-key-2026")


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _base64url_decode(s: str) -> bytes:
    padding = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def create_access_token(data: Dict[str, Any], expires_delta_seconds: int = 86400) -> str:
    """Generates a signed HS256 JWT access token."""
    secret = get_jwt_secret()
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()
    now = int(time.time())
    payload.update({
        "iat": now,
        "exp": now + expires_delta_seconds,
        "sub": "admin",
    })

    header_b64 = _base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed HS256 JWT access token.
    
    Returns payload dictionary if valid, or None if invalid/expired.
    """
    try:
        parts = token.strip().split('.')
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts
        secret = get_jwt_secret()

        # Re-compute signature
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(secret.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_signature = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_signature, actual_signature):
            return None

        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        # Expiration check
        exp = payload.get("exp")
        if exp is None or int(exp) < int(time.time()):
            return None

        return payload
    except Exception:
        return None


def verify_admin_password(provided_password: str) -> bool:
    """Validates provided password string against ADMIN_PASSWORD env variable."""
    expected = get_admin_password()
    return hmac.compare_digest(provided_password.encode('utf-8'), expected.encode('utf-8'))


# FastAPI Security Bearer Scheme
security = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """FastAPI Dependency for protecting settings routes.
    
    Requires Bearer token in Authorization header.
    Raises 401 Unauthorized if missing, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin authentication token required to access settings.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin authentication token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
