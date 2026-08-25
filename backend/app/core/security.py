from __future__ import annotations

from typing import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=True)

# Auth.js uses HS256 by default with AUTH_SECRET
_ALGORITHMS = ["HS256"]

# ---------------------------------------------------------------------------
# RBAC Permissions Catalog
# ---------------------------------------------------------------------------

PERM_USERS_READ = "users:read"
PERM_USERS_MANAGE = "users:manage"
PERM_COMPANIES_READ = "companies:read"
PERM_COMPANIES_MANAGE = "companies:manage"
PERM_JOBS_READ = "jobs:read"
PERM_JOBS_MANAGE = "jobs:manage"
PERM_APPLICATIONS_READ = "applications:read"
PERM_APPLICATIONS_MANAGE = "applications:manage"
PERM_STUDENTS_READ = "students:read"
PERM_STUDENTS_MANAGE = "students:manage"
PERM_ANNOUNCEMENTS_MANAGE = "announcements:manage"
PERM_FEEDBACKS_MANAGE = "feedbacks:manage"
PERM_NOC_MANAGE = "noc:manage"
PERM_TEAM_MANAGE = "team:manage"
PERM_ANALYTICS_VIEW = "analytics:view"
PERM_SETTINGS_MANAGE = "settings:manage"

ALL_PERMISSIONS = [
    PERM_USERS_READ,
    PERM_USERS_MANAGE,
    PERM_COMPANIES_READ,
    PERM_COMPANIES_MANAGE,
    PERM_JOBS_READ,
    PERM_JOBS_MANAGE,
    PERM_APPLICATIONS_READ,
    PERM_APPLICATIONS_MANAGE,
    PERM_STUDENTS_READ,
    PERM_STUDENTS_MANAGE,
    PERM_ANNOUNCEMENTS_MANAGE,
    PERM_FEEDBACKS_MANAGE,
    PERM_NOC_MANAGE,
    PERM_TEAM_MANAGE,
    PERM_ANALYTICS_VIEW,
    PERM_SETTINGS_MANAGE,
]

ROLE_DEFAULT_PERMISSIONS: dict[str, list[str]] = {
    "SUPER_ADMIN": list(ALL_PERMISSIONS),
    "ADMIN": [
        PERM_USERS_READ,
        PERM_USERS_MANAGE,
        PERM_COMPANIES_READ,
        PERM_COMPANIES_MANAGE,
        PERM_JOBS_READ,
        PERM_JOBS_MANAGE,
        PERM_APPLICATIONS_READ,
        PERM_APPLICATIONS_MANAGE,
        PERM_STUDENTS_READ,
        PERM_STUDENTS_MANAGE,
        PERM_ANNOUNCEMENTS_MANAGE,
        PERM_FEEDBACKS_MANAGE,
        PERM_NOC_MANAGE,
        PERM_TEAM_MANAGE,
        PERM_ANALYTICS_VIEW,
        PERM_SETTINGS_MANAGE,
    ],
    "OFFICER": [
        PERM_USERS_READ,
        PERM_COMPANIES_READ,
        PERM_COMPANIES_MANAGE,
        PERM_JOBS_READ,
        PERM_JOBS_MANAGE,
        PERM_APPLICATIONS_READ,
        PERM_APPLICATIONS_MANAGE,
        PERM_STUDENTS_READ,
        PERM_ANNOUNCEMENTS_MANAGE,
        PERM_FEEDBACKS_MANAGE,
        PERM_NOC_MANAGE,
        PERM_TEAM_MANAGE,
        PERM_ANALYTICS_VIEW,
    ],
    "COORDINATOR": [
        PERM_COMPANIES_READ,
        PERM_JOBS_READ,
        PERM_JOBS_MANAGE,
        PERM_APPLICATIONS_READ,
        PERM_APPLICATIONS_MANAGE,
        PERM_STUDENTS_READ,
        PERM_ANNOUNCEMENTS_MANAGE,
        PERM_ANALYTICS_VIEW,
    ],
    "STUDENT": [],
}

PERMISSION_METADATA = [
    {
        "key": PERM_USERS_READ,
        "label": "View Users & Roles",
        "category": "Users & RBAC",
        "description": "View directory of users, roles, and assigned permissions.",
    },
    {
        "key": PERM_USERS_MANAGE,
        "label": "Manage Users & Permissions",
        "category": "Users & RBAC",
        "description": "Create, elevate, de-elevate, edit custom permissions, and remove users.",
    },
    {
        "key": PERM_COMPANIES_READ,
        "label": "View Companies",
        "category": "Companies",
        "description": "View recruiting companies and profiles.",
    },
    {
        "key": PERM_COMPANIES_MANAGE,
        "label": "Manage Companies",
        "category": "Companies",
        "description": "Create, update, and remove company profiles.",
    },
    {
        "key": PERM_JOBS_READ,
        "label": "View Job Profiles",
        "category": "Job Profiles",
        "description": "View job profiles and openings.",
    },
    {
        "key": PERM_JOBS_MANAGE,
        "label": "Manage Job Profiles",
        "category": "Job Profiles",
        "description": "Create, edit, publish, and close job postings.",
    },
    {
        "key": PERM_APPLICATIONS_READ,
        "label": "View Applications",
        "category": "Applications",
        "description": "View submitted student applications and candidate lists.",
    },
    {
        "key": PERM_APPLICATIONS_MANAGE,
        "label": "Manage Applications",
        "category": "Applications",
        "description": "Progress stages (Shortlist, Interview, Selected), bulk update, export CSV.",
    },
    {
        "key": PERM_STUDENTS_READ,
        "label": "View Student Directory",
        "category": "Students",
        "description": "Search and inspect student academic records and profiles.",
    },
    {
        "key": PERM_STUDENTS_MANAGE,
        "label": "Manage Student Records",
        "category": "Students",
        "description": "Edit backlogs, placement bans, and academic eligibility overrides.",
    },
    {
        "key": PERM_ANNOUNCEMENTS_MANAGE,
        "label": "Manage Announcements",
        "category": "Announcements",
        "description": "Create, edit, and publish institute placement updates.",
    },
    {
        "key": PERM_FEEDBACKS_MANAGE,
        "label": "Manage Feedback",
        "category": "Feedback",
        "description": "Respond to and resolve student queries and complaints.",
    },
    {
        "key": PERM_NOC_MANAGE,
        "label": "Manage NOC Requests",
        "category": "Forms & NOC",
        "description": "Review, approve, or reject student NOC requests.",
    },
    {
        "key": PERM_TEAM_MANAGE,
        "label": "Manage Placement Team",
        "category": "Team",
        "description": "Manage placement team directory and coordinators.",
    },
    {
        "key": PERM_ANALYTICS_VIEW,
        "label": "View Analytics",
        "category": "Analytics",
        "description": "View placement metrics, salary analytics, and funnels.",
    },
    {
        "key": PERM_SETTINGS_MANAGE,
        "label": "System Settings",
        "category": "Settings",
        "description": "Manage portal system settings and configuration.",
    },
]


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
    """ADMIN_EMAILS is the bootstrap source of administrator access."""
    return bool(email) and email in settings.admin_email_set


def is_student_email(email: str) -> bool:
    _, _, domain = email.partition("@")
    return bool(domain) and domain == settings.normalized_student_domain


def is_elevated_role(role: str) -> bool:
    return role in ("COORDINATOR", "OFFICER", "ADMIN", "SUPER_ADMIN")


def compute_effective_permissions(
    role: str,
    custom_permissions: list[str] | None = None,
    email: str | None = None,
) -> list[str]:
    """
    Compute full effective permissions for a role, combining role defaults
    and explicit custom permissions.
    """
    if email and is_admin_email(email):
        return list(ALL_PERMISSIONS)
    if role == "SUPER_ADMIN":
        return list(ALL_PERMISSIONS)

    base = set(ROLE_DEFAULT_PERMISSIONS.get(role, []))
    if custom_permissions:
        for perm in custom_permissions:
            if perm.startswith("-"):
                base.discard(perm[1:])
            elif perm in ALL_PERMISSIONS:
                base.add(perm)
    return sorted(list(base))


def has_permission(payload: dict, permission: str) -> bool:
    """
    Check if a JWT payload possesses a given permission.
    """
    email = _email_of(payload)
    if is_admin_email(email) or payload.get("role") == "SUPER_ADMIN":
        return True

    # If permissions are already computed and attached to token
    token_perms = payload.get("permissions")
    if token_perms is not None:
        return permission in token_perms

    role = payload.get("role", "STUDENT")
    custom = payload.get("customPermissions", [])
    effective = compute_effective_permissions(role, custom, email)
    return permission in effective


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Dependency: decode the bearer JWT and return the full payload.
    Rejects accounts not permitted to use the placement portal or deactivated accounts.
    """
    payload = _decode_token(credentials.credentials)
    email = _email_of(payload)
    role = payload.get("role", "STUDENT")
    if not (is_student_email(email) or is_admin_email(email) or is_elevated_role(role)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not permitted to use the placement portal.",
        )
    if payload.get("isActive") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    return payload


def require_student(
    payload: dict = Depends(get_current_user),
) -> dict:
    """
    Dependency: asserts the caller is a student.
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
    Dependency: asserts the caller has administrative access.
    """
    email = _email_of(payload)
    role = payload.get("role", "STUDENT")

    if is_admin_email(email):
        return payload

    if not is_student_email(email):
        # External accounts require being listed in ADMIN_EMAILS
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required for this resource.",
        )

    # For institute domain accounts, check if they hold an elevated role or custom admin permission
    if role in ("SUPER_ADMIN", "ADMIN", "OFFICER", "COORDINATOR") or has_permission(payload, PERM_USERS_READ):
        return payload

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Administrator access is required for this resource.",
    )


def require_permission(permission: str) -> Callable:
    """
    Dependency factory: asserts the caller has a specific RBAC permission.
    """
    def _dependency(payload: dict = Depends(get_current_user)) -> dict:
        if not has_permission(payload, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' is required for this resource.",
            )
        return payload

    return _dependency
