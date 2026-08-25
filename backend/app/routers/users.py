from __future__ import annotations

import math
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    ALL_PERMISSIONS,
    PERMISSION_METADATA,
    PERM_USERS_MANAGE,
    PERM_USERS_READ,
    ROLE_DEFAULT_PERMISSIONS,
    compute_effective_permissions,
    is_admin_email,
    require_permission,
)
from app.dependencies import get_db
from app.models.db import Application, JobProfile, Announcement, Role, User
from app.schemas.user import (
    PermissionCatalogResponse,
    PermissionItem,
    UserCreate,
    UserListResponse,
    UserPermissionsUpdate,
    UserRoleUpdate,
    UserStats,
    UserStatusUpdate,
    UserSummary,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


def _to_user_summary(user: User, application_count: int = 0) -> UserSummary:
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    custom_perms = user.customPermissions or []
    effective_perms = compute_effective_permissions(role_str, custom_perms, user.email)
    return UserSummary(
        id=user.id,
        name=user.name,
        email=user.email,
        image=user.image,
        role=role_str,
        title=user.title,
        isActive=user.isActive,
        rollNumber=user.rollNumber,
        branch=user.branch,
        batch=user.batch,
        customPermissions=custom_perms,
        effectivePermissions=effective_perms,
        applicationCount=application_count,
        createdAt=user.createdAt,
    )


@router.get("/permissions/catalog", response_model=PermissionCatalogResponse)
async def get_permissions_catalog(
    caller: dict = Depends(require_permission(PERM_USERS_READ)),
):
    """
    Returns the comprehensive catalog of all system permissions, categories,
    and role defaults.
    """
    categories = sorted(list({item["category"] for item in PERMISSION_METADATA}))
    items = []
    for meta in PERMISSION_METADATA:
        key = meta["key"]
        default_roles = [
            role for role, perms in ROLE_DEFAULT_PERMISSIONS.items() if key in perms
        ]
        items.append(
            PermissionItem(
                key=key,
                label=meta["label"],
                category=meta["category"],
                description=meta["description"],
                defaultRoles=default_roles,
            )
        )

    return PermissionCatalogResponse(
        permissions=items,
        categories=categories,
        roleDefaults=ROLE_DEFAULT_PERMISSIONS,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    query: Optional[str] = Query(None, description="Search name, email, roll number, or title"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by active status: 'active', 'inactive', or 'all'"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    caller: dict = Depends(require_permission(PERM_USERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users in the portal with filters, search, pagination, and stats.
    """
    stmt = select(User)

    if query:
        term = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.name).like(term),
                func.lower(User.email).like(term),
                func.lower(User.rollNumber).like(term),
                func.lower(User.title).like(term),
                func.lower(User.branch).like(term),
            )
        )

    if role and role.upper() != "ALL":
        try:
            role_enum = Role(role.upper())
            stmt = stmt.where(User.role == role_enum)
        except ValueError:
            pass

    if status and status.lower() != "all":
        if status.lower() == "active":
            stmt = stmt.where(User.isActive.is_(True))
        elif status.lower() == "inactive":
            stmt = stmt.where(User.isActive.is_(False))

    # Total matching count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.scalar(count_stmt)) or 0

    # Paginate
    offset = (page - 1) * limit
    stmt = stmt.order_by(User.createdAt.desc()).offset(offset).limit(limit)
    users = (await db.scalars(stmt)).all()

    # Get application counts for returned users
    user_ids = [u.id for u in users]
    app_counts: dict[str, int] = {}
    if user_ids:
        app_stmt = (
            select(Application.userId, func.count(Application.id))
            .where(Application.userId.in_(user_ids))
            .group_by(Application.userId)
        )
        app_results = (await db.execute(app_stmt)).all()
        app_counts = {r[0]: r[1] for r in app_results}

    summaries = [_to_user_summary(u, app_counts.get(u.id, 0)) for u in users]

    # Global counts for stats
    super_admins_count = (await db.scalar(select(func.count(User.id)).where(User.role == Role.SUPER_ADMIN))) or 0
    admins_count = (await db.scalar(select(func.count(User.id)).where(User.role == Role.ADMIN))) or 0
    officers_count = (await db.scalar(select(func.count(User.id)).where(User.role == Role.OFFICER))) or 0
    coordinators_count = (await db.scalar(select(func.count(User.id)).where(User.role == Role.COORDINATOR))) or 0
    students_count = (await db.scalar(select(func.count(User.id)).where(User.role == Role.STUDENT))) or 0
    inactive_count = (await db.scalar(select(func.count(User.id)).where(User.isActive.is_(False)))) or 0
    total_users_count = (await db.scalar(select(func.count(User.id)))) or 0

    stats = UserStats(
        totalUsers=total_users_count,
        superAdmins=super_admins_count,
        admins=admins_count,
        officers=officers_count,
        coordinators=coordinators_count,
        students=students_count,
        inactive=inactive_count,
    )

    return UserListResponse(users=summaries, total=total, stats=stats)


@router.get("/{user_id}", response_model=UserSummary)
async def get_user(
    user_id: str,
    caller: dict = Depends(require_permission(PERM_USERS_READ)),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    app_count = (await db.scalar(select(func.count(Application.id)).where(Application.userId == user.id))) or 0
    return _to_user_summary(user, app_count)


@router.post("", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    caller: dict = Depends(require_permission(PERM_USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Pre-provision or create a user with defined role, title, and initial custom permissions.
    """
    clean_email = data.email.strip().lower()
    existing = await db.scalar(select(User).where(User.email == clean_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email '{clean_email}' already exists.",
        )

    try:
        role_enum = Role(data.role.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{data.role}'. Allowed roles: {[r.value for r in Role]}",
        )

    # Validate custom permissions
    for p in data.customPermissions:
        base_p = p[1:] if p.startswith("-") else p
        if base_p not in ALL_PERMISSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission '{p}' in customPermissions.",
            )

    new_user = User(
        id=f"cuid_{uuid.uuid4().hex[:20]}",
        email=clean_email,
        name=data.name.strip() if data.name else None,
        role=role_enum,
        title=data.title.strip() if data.title else None,
        rollNumber=data.rollNumber.strip() if data.rollNumber else None,
        branch=data.branch.strip() if data.branch else None,
        batch=data.batch,
        customPermissions=data.customPermissions,
        isActive=data.isActive,
        semGPAs=[],
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return _to_user_summary(new_user, 0)


@router.patch("/{user_id}", response_model=UserSummary)
async def update_user_details(
    user_id: str,
    data: UserUpdate,
    caller: dict = Depends(require_permission(PERM_USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if data.name is not None:
        user.name = data.name.strip() if data.name else None
    if data.title is not None:
        user.title = data.title.strip() if data.title else None
    if data.rollNumber is not None:
        clean_roll = data.rollNumber.strip() if data.rollNumber else None
        if clean_roll:
            dup_roll = await db.scalar(
                select(User).where(User.rollNumber == clean_roll, User.id != user.id)
            )
            if dup_roll:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Roll number '{clean_roll}' is already in use by another user.",
                )
        user.rollNumber = clean_roll
    if data.branch is not None:
        user.branch = data.branch.strip() if data.branch else None
    if data.batch is not None:
        user.batch = data.batch
    if data.personalEmail is not None:
        user.personalEmail = data.personalEmail.strip() if data.personalEmail else None
    if data.contactNumber is not None:
        user.contactNumber = data.contactNumber.strip() if data.contactNumber else None

    await db.commit()
    await db.refresh(user)
    app_count = (await db.scalar(select(func.count(Application.id)).where(Application.userId == user.id))) or 0
    return _to_user_summary(user, app_count)


@router.patch("/{user_id}/role", response_model=UserSummary)
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    caller: dict = Depends(require_permission(PERM_USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Elevate or de-elevate a user's role.
    Guarded against self-demotion and removal of the last superadmin.
    """
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    try:
        new_role = Role(data.role.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{data.role}'. Allowed roles: {[r.value for r in Role]}",
        )

    caller_id = caller.get("sub")
    caller_email = (caller.get("email") or "").strip().lower()

    # Self-demotion guard
    if (user.id == caller_id or user.email == caller_email) and new_role in (Role.STUDENT, Role.COORDINATOR):
        if not is_admin_email(caller_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot demote your own administrator account.",
            )

    # Last super-admin / admin guard
    if user.role in (Role.SUPER_ADMIN, Role.ADMIN) and new_role not in (Role.SUPER_ADMIN, Role.ADMIN):
        admin_count = (
            await db.scalar(
                select(func.count(User.id)).where(
                    User.role.in_([Role.SUPER_ADMIN, Role.ADMIN]),
                    User.isActive.is_(True),
                    User.id != user.id,
                )
            )
        ) or 0
        if admin_count == 0 and not is_admin_email(user.email or ""):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active administrator.",
            )

    user.role = new_role
    if data.title is not None:
        user.title = data.title.strip() if data.title else None

    await db.commit()
    await db.refresh(user)
    app_count = (await db.scalar(select(func.count(Application.id)).where(Application.userId == user.id))) or 0
    return _to_user_summary(user, app_count)


@router.patch("/{user_id}/permissions", response_model=UserSummary)
async def update_user_permissions(
    user_id: str,
    data: UserPermissionsUpdate,
    caller: dict = Depends(require_permission(PERM_USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Set custom permissions (explicit grants or revokes) for a specific user.
    """
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    for p in data.customPermissions:
        base_p = p[1:] if p.startswith("-") else p
        if base_p not in ALL_PERMISSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission '{p}'.",
            )

    user.customPermissions = data.customPermissions
    await db.commit()
    await db.refresh(user)
    app_count = (await db.scalar(select(func.count(Application.id)).where(Application.userId == user.id))) or 0
    return _to_user_summary(user, app_count)


@router.patch("/{user_id}/status", response_model=UserSummary)
async def update_user_status(
    user_id: str,
    data: UserStatusUpdate,
    caller: dict = Depends(require_permission(PERM_USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate or suspend a user account.
    """
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    caller_id = caller.get("sub")
    caller_email = (caller.get("email") or "").strip().lower()

    if (user.id == caller_id or user.email == caller_email) and not data.isActive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    if not data.isActive and user.role in (Role.SUPER_ADMIN, Role.ADMIN):
        admin_count = (
            await db.scalar(
                select(func.count(User.id)).where(
                    User.role.in_([Role.SUPER_ADMIN, Role.ADMIN]),
                    User.isActive.is_(True),
                    User.id != user.id,
                )
            )
        ) or 0
        if admin_count == 0 and not is_admin_email(user.email or ""):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active administrator.",
            )

    user.isActive = data.isActive
    await db.commit()
    await db.refresh(user)
    app_count = (await db.scalar(select(func.count(Application.id)).where(Application.userId == user.id))) or 0
    return _to_user_summary(user, app_count)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    caller: dict = Depends(require_permission(PERM_USERS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Safely delete a user account and reconcile any created job/announcement references.
    """
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    caller_id = caller.get("sub")
    caller_email = (caller.get("email") or "").strip().lower()

    if user.id == caller_id or user.email == caller_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    if user.role in (Role.SUPER_ADMIN, Role.ADMIN):
        admin_count = (
            await db.scalar(
                select(func.count(User.id)).where(
                    User.role.in_([Role.SUPER_ADMIN, Role.ADMIN]),
                    User.isActive.is_(True),
                    User.id != user.id,
                )
            )
        ) or 0
        if admin_count == 0 and not is_admin_email(user.email or ""):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last active administrator.",
            )

    # Reassign any jobs or announcements created by this user to caller to prevent FK violation
    if caller_id:
        caller_user = await db.scalar(select(User).where(User.id == caller_id))
        if caller_user:
            jobs = (await db.scalars(select(JobProfile).where(JobProfile.createdById == user.id))).all()
            for job in jobs:
                job.createdById = caller_user.id
            announcements = (await db.scalars(select(Announcement).where(Announcement.createdById == user.id))).all()
            for ann in announcements:
                ann.createdById = caller_user.id

    await db.delete(user)
    await db.commit()

    return {"message": f"User '{user.email or user.name}' deleted successfully."}
