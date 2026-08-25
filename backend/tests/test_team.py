"""Tests for Placement Team schemas, default permissions, and user permission auto-grant/revoke."""
from __future__ import annotations

import json
import pytest
from pydantic import ValidationError

from app.core.security import (
    ALL_PERMISSIONS,
    PERM_ANNOUNCEMENTS_MANAGE,
    PERM_APPLICATIONS_MANAGE,
    PERM_COMPANIES_READ,
    PERM_JOBS_MANAGE,
    PERM_JOBS_READ,
    PERM_TEAM_MANAGE,
    PERM_USERS_MANAGE,
)
from app.models.db import TeamMember, User
from app.routers.team import (
    DEFAULT_PLACEMENT_TEAM_PERMISSIONS,
    PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY,
    get_default_team_permissions,
    grant_team_permissions_to_user,
    revoke_team_permissions_from_user,
)
from app.schemas.team import (
    DefaultPermissionsResponse,
    DefaultPermissionsUpdate,
    ReorderTeamRequest,
    TeamAdminMemberResponse,
    TeamMemberCreate,
    TeamMemberOrderUpdate,
    TeamMemberResponse,
    TeamMemberUpdate,
)


def test_team_member_create_schema_valid():
    data = TeamMemberCreate(
        name="Aarav Sharma",
        role="Student Placement Coordinator",
        email="aarav@iiitl.ac.in",
        phone="9876543210",
        displayOrder=1,
    )
    assert data.name == "Aarav Sharma"
    assert data.email == "aarav@iiitl.ac.in"
    assert data.displayOrder == 1


def test_team_member_update_schema_optional_fields():
    data = TeamMemberUpdate(role="Lead Coordinator")
    assert data.role == "Lead Coordinator"
    assert data.name is None
    assert "email" not in data.model_fields_set

    data_clear_email = TeamMemberUpdate(email=None)
    assert data_clear_email.email is None
    assert "email" in data_clear_email.model_fields_set


def test_default_permissions_update_schema_valid():
    update = DefaultPermissionsUpdate(
        defaultPermissions=[PERM_JOBS_READ, PERM_JOBS_MANAGE, PERM_APPLICATIONS_MANAGE],
        syncExistingMembers=True,
    )
    assert len(update.defaultPermissions) == 3
    assert update.syncExistingMembers is True


def test_reorder_team_request_schema():
    reorder = ReorderTeamRequest(
        items=[
            TeamMemberOrderUpdate(id="mem-1", displayOrder=2),
            TeamMemberOrderUpdate(id="mem-2", displayOrder=1),
        ]
    )
    assert len(reorder.items) == 2
    assert reorder.items[0].id == "mem-1"
    assert reorder.items[0].displayOrder == 2


@pytest.mark.asyncio
async def test_grant_and_revoke_team_permissions_logic():
    # Simulate User in memory
    user = User(
        id="user-1",
        email="coordinator@iiitl.ac.in",
        customPermissions=["students:read"],
    )

    default_perms = [PERM_JOBS_READ, PERM_JOBS_MANAGE, PERM_APPLICATIONS_MANAGE]

    # Mock DB session
    class MockDbSession:
        def __init__(self, user_obj):
            self.user = user_obj

        async def scalar(self, stmt):
            # If checking TeamMember
            stmt_str = str(stmt)
            if "TeamMember" in stmt_str:
                return None
            return self.user

    db_mock = MockDbSession(user)

    # 1. Grant team permissions
    await grant_team_permissions_to_user(db_mock, user.email, default_perms)
    assert PERM_JOBS_READ in user.customPermissions
    assert PERM_JOBS_MANAGE in user.customPermissions
    assert PERM_APPLICATIONS_MANAGE in user.customPermissions
    assert "students:read" in user.customPermissions  # Preserved previous custom permission

    # 2. Revoke team permissions
    await revoke_team_permissions_from_user(db_mock, user.email, default_perms)
    assert PERM_JOBS_READ not in user.customPermissions
    assert PERM_JOBS_MANAGE not in user.customPermissions
    assert "students:read" in user.customPermissions  # Prior manual custom permission still preserved!


@pytest.mark.asyncio
async def test_get_default_team_permissions_fallback():
    class MockEmptyDb:
        async def scalar(self, stmt):
            return None

    db_mock = MockEmptyDb()
    perms = await get_default_team_permissions(db_mock)
    assert set(perms) == set(DEFAULT_PLACEMENT_TEAM_PERMISSIONS)
