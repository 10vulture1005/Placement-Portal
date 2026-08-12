from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=True)

# Auth.js uses HS256 by default with AUTH_SECRET
_ALGORITHMS = ["HS256"]


def _decode_token(token: str) -> dict:
    """
    Decode and verify an Auth.js-issued JWT.
    Raises HTTP 401 if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=_ALGORITHMS)
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency: decode the bearer JWT and return the full payload.
    Use this when you need the raw token claims.
    """
    return _decode_token(credentials.credentials)


def require_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency: verifies the token and asserts the caller has role=STUDENT.
    Returns the token payload dict with at minimum: sub (user id), role, email.
    """
    payload = _decode_token(credentials.credentials)
    if payload.get("role") != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access is required for this resource.",
        )
    return payload


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency: verifies the token and asserts the caller has role=ADMIN.
    Returns the token payload dict.
    """
    payload = _decode_token(credentials.credentials)
    if payload.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required for this resource.",
        )
    return payload
