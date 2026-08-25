from __future__ import annotations

import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    ALL_PERMISSIONS,
    PERM_TEAM_MANAGE,
    require_permission,
)
from app.dependencies import get_db
from app.models.db import SystemSetting, TeamMember, User
from app.schemas.team import (
    DefaultPermissionsResponse,
    DefaultPermissionsUpdate,
    ReorderTeamRequest,
    TeamAdminMemberResponse,
    TeamMemberCreate,
    TeamMemberResponse,
    TeamMemberUpdate,
)

router = APIRouter(prefix="/team", tags=["team"])

PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY = "placement_team_default_permissions"

DEFAULT_PLACEMENT_TEAM_PERMISSIONS = [
    "companies:read",
    "jobs:read",
    "jobs:manage",
    "applications:read",
    "applications:manage",
    "students:read",
    "announcements:manage",
    "analytics:view",
]


async def get_default_team_permissions(db: AsyncSession) -> list[str]:
    setting = await db.scalar(
        select(SystemSetting).where(SystemSetting.key == PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY)
    )
    if setting and setting.value:
        try:
            parsed = json.loads(setting.value)
            if isinstance(parsed, list):
                return [p for p in parsed if p in ALL_PERMISSIONS]
        except Exception:
            pass
    return list(DEFAULT_PLACEMENT_TEAM_PERMISSIONS)


async def grant_team_permissions_to_user(
    db: AsyncSession, email: Optional[str], default_perms: list[str]
) -> None:
    if not email:
        return
    clean_email = email.strip().lower()
    user = await db.scalar(
        select(User).where(func.lower(User.email) == clean_email)
    )
    if user:
        current_perms = set(user.customPermissions or [])
        updated_perms = list(current_perms.union(default_perms))
        user.customPermissions = updated_perms


async def revoke_team_permissions_from_user(
    db: AsyncSession, email: Optional[str], default_perms: list[str], exclude_member_id: Optional[str] = None
) -> None:
    if not email:
        return
    clean_email = email.strip().lower()

    # Check if another TeamMember has this email
    stmt = select(TeamMember).where(func.lower(TeamMember.email) == clean_email)
    if exclude_member_id:
        stmt = stmt.where(TeamMember.id != exclude_member_id)
    other_member = await db.scalar(stmt)
    if other_member:
        return

    user = await db.scalar(
        select(User).where(func.lower(User.email) == clean_email)
    )
    if user:
        user.customPermissions = [
            p for p in (user.customPermissions or []) if p not in default_perms
        ]


@router.get("", response_model=list[TeamMemberResponse])
async def list_team(db: AsyncSession = Depends(get_db)):
    """
    Public directory: list placement team members ordered by displayOrder.
    """
    team = await db.scalars(
        select(TeamMember).order_by(TeamMember.displayOrder.asc(), TeamMember.name.asc())
    )
    return team.all()


@router.get("/admin", response_model=list[TeamAdminMemberResponse])
async def list_team_admin(
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin directory: list placement team members with linked User account status.
    """
    team_members = (
        await db.scalars(
            select(TeamMember).order_by(TeamMember.displayOrder.asc(), TeamMember.name.asc())
        )
    ).all()

    # Preload users for matching emails
    emails = [m.email.strip().lower() for m in team_members if m.email]
    users_by_email: dict[str, User] = {}
    if emails:
        users = (
            await db.scalars(
                select(User).where(func.lower(User.email).in_(emails))
            )
        ).all()
        for u in users:
            if u.email:
                users_by_email[u.email.strip().lower()] = u

    results = []
    for member in team_members:
        member_email = member.email.strip().lower() if member.email else None
        user = users_by_email.get(member_email) if member_email else None

        results.append(
            TeamAdminMemberResponse(
                id=member.id,
                name=member.name,
                role=member.role,
                email=member.email,
                phone=member.phone,
                photoUrl=member.photoUrl,
                displayOrder=member.displayOrder,
                userId=user.id if user else None,
                hasUserAccount=user is not None,
                userRole=user.role.value if (user and hasattr(user.role, "value")) else (str(user.role) if user else None),
                userActive=user.isActive if user else None,
                userCustomPermissions=user.customPermissions or [] if user else [],
            )
        )

    return results


@router.get("/permissions/defaults", response_model=DefaultPermissionsResponse)
async def get_default_permissions(
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve configured default permissions for placement team members.
    """
    perms = await get_default_team_permissions(db)
    return DefaultPermissionsResponse(defaultPermissions=perms)


@router.put("/permissions/defaults", response_model=DefaultPermissionsResponse)
async def update_default_permissions(
    data: DefaultPermissionsUpdate,
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update default permissions for placement team members, with optional batch sync.
    """
    for p in data.defaultPermissions:
        if p not in ALL_PERMISSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission '{p}'.",
            )

    setting = await db.scalar(
        select(SystemSetting).where(SystemSetting.key == PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY)
    )
    if not setting:
        setting = SystemSetting(
            key=PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY,
            value=json.dumps(data.defaultPermissions),
        )
        db.add(setting)
    else:
        setting.value = json.dumps(data.defaultPermissions)

    if data.syncExistingMembers:
        team_members = (await db.scalars(select(TeamMember))).all()
        emails = [m.email.strip().lower() for m in team_members if m.email]
        if emails:
            users = (
                await db.scalars(
                    select(User).where(func.lower(User.email).in_(emails))
                )
            ).all()
            for user in users:
                user.customPermissions = list(
                    set(user.customPermissions or []).union(data.defaultPermissions)
                )

    await db.commit()
    return DefaultPermissionsResponse(defaultPermissions=data.defaultPermissions)


@router.post("", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_team_member(
    data: TeamMemberCreate,
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a team member and automatically assign placement team default permissions
    to their linked user account if one exists.
    """
    clean_name = data.name.strip()
    clean_role = data.role.strip()
    clean_email = data.email.strip().lower() if data.email else None
    clean_phone = data.phone.strip() if data.phone else None
    clean_photo = data.photoUrl.strip() if data.photoUrl else None

    # Calculate display order if 0 or not given
    display_order = data.displayOrder
    if display_order <= 0:
        max_order = (await db.scalar(select(func.max(TeamMember.displayOrder)))) or 0
        display_order = max_order + 1

    new_member = TeamMember(
        id=f"cuid_{uuid.uuid4().hex[:20]}",
        name=clean_name,
        role=clean_role,
        email=clean_email,
        phone=clean_phone,
        photoUrl=clean_photo,
        displayOrder=display_order,
    )
    db.add(new_member)

    # Automatically grant default placement team permissions to user if account exists
    if clean_email:
        default_perms = await get_default_team_permissions(db)
        await grant_team_permissions_to_user(db, clean_email, default_perms)

    await db.commit()
    await db.refresh(new_member)
    return new_member


@router.patch("/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(
    member_id: str,
    data: TeamMemberUpdate,
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update team member details and reconcile linked user permissions if email changed.
    """
    member = await db.scalar(select(TeamMember).where(TeamMember.id == member_id))
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    old_email = member.email.strip().lower() if member.email else None
    fields_set = data.model_fields_set

    if "name" in fields_set and data.name is not None:
        member.name = data.name.strip()
    if "role" in fields_set and data.role is not None:
        member.role = data.role.strip()
    if "phone" in fields_set:
        member.phone = data.phone.strip() if data.phone else None
    if "photoUrl" in fields_set:
        member.photoUrl = data.photoUrl.strip() if data.photoUrl else None
    if "displayOrder" in fields_set and data.displayOrder is not None:
        member.displayOrder = data.displayOrder

    if "email" in fields_set:
        new_email = data.email.strip().lower() if data.email else None
        if new_email != old_email:
            default_perms = await get_default_team_permissions(db)
            if old_email:
                await revoke_team_permissions_from_user(
                    db, old_email, default_perms, exclude_member_id=member.id
                )
            if new_email:
                await grant_team_permissions_to_user(db, new_email, default_perms)
            member.email = new_email

    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{member_id}")
async def delete_team_member(
    member_id: str,
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a team member and revoke default placement team permissions from their user account.
    """
    member = await db.scalar(select(TeamMember).where(TeamMember.id == member_id))
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")

    if member.email:
        default_perms = await get_default_team_permissions(db)
        await revoke_team_permissions_from_user(
            db, member.email, default_perms, exclude_member_id=member.id
        )

    await db.delete(member)
    await db.commit()
    return {"message": f"Team member '{member.name}' removed successfully."}


@router.put("/reorder")
async def reorder_team_members(
    data: ReorderTeamRequest,
    caller: dict = Depends(require_permission(PERM_TEAM_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch update display order of team members.
    """
    for item in data.items:
        member = await db.scalar(select(TeamMember).where(TeamMember.id == item.id))
        if member:
            member.displayOrder = item.displayOrder

    await db.commit()
    return {"message": "Team members reordered successfully."}
