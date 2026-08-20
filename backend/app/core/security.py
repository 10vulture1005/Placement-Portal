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
        return jwt.decode(token, settings.auth_secret, algorithms=_ALGORITHMS)
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


def _email_of(payload: dict) -> str:
    return (payload.get("email") or "").strip().lower()


def is_admin_email(email: str) -> bool:
    """ADMIN_EMAILS is the only source of administrator access."""
    return bool(email) and email in settings.admin_email_set


def is_student_email(email: str) -> bool:
    _, _, domain = email.partition("@")
    return bool(domain) and domain == settings.normalized_student_domain


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency: decode the bearer JWT and return the full payload.
    Rejects any account that is neither an institute student nor a
    configured administrator, so revoking access in .env takes effect here
    even while a previously issued token is still within its lifetime.
    """
    payload = _decode_token(credentials.credentials)
    email = _email_of(payload)
    if not (is_student_email(email) or is_admin_email(email)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not permitted to use the placement portal.",
        )
    return payload


def require_student(
    payload: dict = Depends(get_current_user),
) -> dict:
    """
    Dependency: asserts the caller is a student.
    Returns the token payload with at minimum: sub (user id), role, email.
    """
    if payload.get("role") != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access is required for this resource.",
        )
    return payload


def require_admin(
    payload: dict = Depends(get_current_user),
) -> dict:
    """
    Dependency: asserts the caller is an administrator.

    The signed role claim is not trusted on its own: the address must also be
    listed in ADMIN_EMAILS right now, so removing it from .env revokes admin
    access immediately rather than when the token expires.
    """
    if payload.get("role") != "ADMIN" or not is_admin_email(_email_of(payload)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required for this resource.",
        )
    return payload
