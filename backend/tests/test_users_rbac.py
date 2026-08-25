"""Tests for RBAC permission computation, role assignment, and security guardrails."""
from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.core import security
from app.core.config import Settings
from app.core.security import (
    ALL_PERMISSIONS,
    PERM_APPLICATIONS_MANAGE,
    PERM_COMPANIES_MANAGE,
    PERM_JOBS_MANAGE,
    PERM_USERS_MANAGE,
    PERM_USERS_READ,
    ROLE_DEFAULT_PERMISSIONS,
    compute_effective_permissions,
    has_permission,
    is_elevated_role,
)
from app.models.db import Role


def build_settings(**overrides) -> Settings:
    base = {
        "admin_emails": "super@iiitl.ac.in",
        "student_email_domain": "iiitl.ac.in",
        "auth_secret": "test-secret",
        "cors_origins": "http://localhost:3000",
    }
    base.update(overrides)
    return Settings(**base)


@pytest.fixture
def configured(monkeypatch):
    def _apply(**overrides) -> Settings:
        replacement = build_settings(**overrides)
        monkeypatch.setattr(security, "settings", replacement)
        return replacement

    return _apply


def test_super_admin_has_all_permissions(configured):
    configured()
    perms = compute_effective_permissions("SUPER_ADMIN")
    assert set(perms) == set(ALL_PERMISSIONS)


def test_admin_email_receives_all_permissions_automatically(configured):
    configured(admin_emails="lead@iiitl.ac.in")
    perms = compute_effective_permissions("STUDENT", email="lead@iiitl.ac.in")
    assert set(perms) == set(ALL_PERMISSIONS)


def test_coordinator_and_officer_default_permissions(configured):
    configured()
    coord_perms = compute_effective_permissions("COORDINATOR")
    assert PERM_JOBS_MANAGE in coord_perms
    assert PERM_APPLICATIONS_MANAGE in coord_perms
    assert PERM_USERS_MANAGE not in coord_perms

    officer_perms = compute_effective_permissions("OFFICER")
    assert PERM_COMPANIES_MANAGE in officer_perms
    assert PERM_USERS_READ in officer_perms


def test_custom_permissions_grant_and_revoke(configured):
    configured()
    # Grant custom permission to student
    student_custom = compute_effective_permissions("STUDENT", custom_permissions=[PERM_JOBS_MANAGE])
    assert PERM_JOBS_MANAGE in student_custom

    # Explicit revocation from Coordinator
    coord_revoked = compute_effective_permissions(
        "COORDINATOR",
        custom_permissions=[f"-{PERM_JOBS_MANAGE}"],
    )
    assert PERM_JOBS_MANAGE not in coord_revoked
    assert PERM_APPLICATIONS_MANAGE in coord_revoked


def test_has_permission_checks_payload(configured):
    configured(admin_emails="admin@iiitl.ac.in")

    # Super admin
    assert has_permission({"role": "SUPER_ADMIN", "email": "user@iiitl.ac.in"}, PERM_USERS_MANAGE) is True

    # Admin email override
    assert has_permission({"role": "STUDENT", "email": "admin@iiitl.ac.in"}, PERM_USERS_MANAGE) is True

    # Coordinator without user management
    assert has_permission({"role": "COORDINATOR", "email": "coord@iiitl.ac.in"}, PERM_USERS_MANAGE) is False
    assert has_permission({"role": "COORDINATOR", "email": "coord@iiitl.ac.in"}, PERM_JOBS_MANAGE) is True

    # Student with custom permission
    assert has_permission(
        {"role": "STUDENT", "email": "s@iiitl.ac.in", "customPermissions": [PERM_COMPANIES_MANAGE]},
        PERM_COMPANIES_MANAGE,
    ) is True


def test_is_elevated_role():
    assert is_elevated_role("SUPER_ADMIN") is True
    assert is_elevated_role("ADMIN") is True
    assert is_elevated_role("OFFICER") is True
    assert is_elevated_role("COORDINATOR") is True
    assert is_elevated_role("STUDENT") is False


def test_require_permission_dependency(configured):
    configured()
    dep = security.require_permission(PERM_USERS_MANAGE)

    # Allowed
    allowed_payload = {"sub": "1", "email": "super@iiitl.ac.in", "role": "ADMIN"}
    assert dep(allowed_payload) == allowed_payload

    # Denied
    denied_payload = {"sub": "2", "email": "student@iiitl.ac.in", "role": "STUDENT"}
    with pytest.raises(HTTPException) as exc:
        dep(denied_payload)
    assert exc.value.status_code == 403


def test_deactivated_account_is_rejected(configured):
    configured()
    from jose import jwt
    secret = "test-secret"
    token = jwt.encode({"sub": "1", "email": "student@iiitl.ac.in", "role": "STUDENT", "isActive": False}, secret, algorithm="HS256")
    from fastapi.security import HTTPAuthorizationCredentials
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc:
        security.get_current_user(creds)
    assert exc.value.status_code == 403
    assert "deactivated" in exc.value.detail.lower()

