from __future__ import annotations

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import PERM_ANNOUNCEMENTS_MANAGE, get_current_user, require_permission
from app.dependencies import get_db
from app.models.db import Announcement, AnnouncementCategory, Company, User
from app.schemas.announcement import (
    AnnouncementAuthorSummary,
    AnnouncementCompanySummary,
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementUpdate,
)

router = APIRouter(prefix="/announcements", tags=["announcements"])


def _to_announcement_response(a: Announcement) -> AnnouncementResponse:
    category_val = a.category.value if hasattr(a.category, "value") else str(a.category)
    company_summary = None
    if a.company:
        company_summary = AnnouncementCompanySummary(
            id=a.company.id,
            name=a.company.name,
            logoUrl=a.company.logoUrl,
            website=a.company.website,
        )

    creator_name = a.created_by.name if a.created_by else None
    creator_email = a.created_by.email if a.created_by else None

    return AnnouncementResponse(
        id=a.id,
        title=a.title,
        content=a.content,
        category=category_val,
        tags=a.tags or [],
        companyId=a.companyId,
        company=company_summary,
        createdAt=a.createdAt,
        createdById=a.createdById,
        createdByName=creator_name,
        createdByEmail=creator_email,
    )


def _parse_category(category_input: str) -> AnnouncementCategory:
    normalized = category_input.strip().upper().replace(" ", "_")
    try:
        return AnnouncementCategory(normalized)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category_input}'. Allowed: {[c.value for c in AnnouncementCategory]}",
        )


@router.get("", response_model=list[AnnouncementResponse])
async def list_announcements(
    category: Optional[str] = Query(None, description="Filter by category (COMPANY_EVENT, GENERAL)"),
    company_id: Optional[str] = Query(None, description="Filter by associated company ID"),
    search: Optional[str] = Query(None, description="Search across title, content, and tags"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    caller: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List announcements with optional filters. Accessible to all authenticated users (students & staff).
    """
    stmt = (
        select(Announcement)
        .options(selectinload(Announcement.company), selectinload(Announcement.created_by))
        .order_by(Announcement.createdAt.desc())
    )

    if category:
        cat_enum = _parse_category(category)
        stmt = stmt.where(Announcement.category == cat_enum)

    if company_id:
        stmt = stmt.where(Announcement.companyId == company_id)

    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Announcement.title).like(term),
                func.lower(Announcement.content).like(term),
                func.lower(func.array_to_string(Announcement.tags, " ")).like(term),
            )
        )

    stmt = stmt.offset(offset).limit(limit)
    announcements = (await db.scalars(stmt)).all()
    return [_to_announcement_response(a) for a in announcements]


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(
    announcement_id: str,
    caller: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a single announcement by ID.
    """
    stmt = (
        select(Announcement)
        .options(selectinload(Announcement.company), selectinload(Announcement.created_by))
        .where(Announcement.id == announcement_id)
    )
    announcement = await db.scalar(stmt)
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )
    return _to_announcement_response(announcement)


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreate,
    caller: dict = Depends(require_permission(PERM_ANNOUNCEMENTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new announcement. Requires 'announcements:manage' permission.
    """
    cat_enum = _parse_category(data.category)

    # Validate company if provided
    clean_company_id = data.companyId.strip() if data.companyId else None
    if cat_enum == AnnouncementCategory.GENERAL:
        clean_company_id = None
    elif clean_company_id:
        company = await db.scalar(select(Company).where(Company.id == clean_company_id))
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company with ID '{clean_company_id}' does not exist.",
            )

    # Resolve author
    caller_sub = caller.get("sub") or caller.get("id")
    author = None
    if caller_sub:
        author = await db.scalar(select(User).where(User.id == caller_sub))
    if not author and caller.get("email"):
        author = await db.scalar(select(User).where(User.email == caller["email"].strip().lower()))

    if not author:
        caller_email = (caller.get("email") or "").strip().lower()
        if not caller_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user profile not found.",
            )
        author_id = caller_sub or f"cuid_{uuid.uuid4().hex[:20]}"
        author = User(
            id=author_id,
            email=caller_email,
            name=caller.get("name"),
            role=caller.get("role", "ADMIN"),
        )
        db.add(author)
        await db.flush()
    else:
        author_id = author.id

    # Clean tags
    clean_tags = [t.strip() for t in data.tags if t and t.strip()]

    announcement_id = f"cuid_{uuid.uuid4().hex[:20]}"
    new_announcement = Announcement(
        id=announcement_id,
        title=data.title.strip(),
        content=data.content.strip(),
        category=cat_enum,
        tags=clean_tags,
        companyId=clean_company_id,
        createdById=author_id,
    )

    db.add(new_announcement)
    await db.commit()

    # Re-fetch with relations for proper response serialization
    stmt = (
        select(Announcement)
        .options(selectinload(Announcement.company), selectinload(Announcement.created_by))
        .where(Announcement.id == announcement_id)
    )
    saved = await db.scalar(stmt)
    return _to_announcement_response(saved)


@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: str,
    data: AnnouncementUpdate,
    caller: dict = Depends(require_permission(PERM_ANNOUNCEMENTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing announcement. Requires 'announcements:manage' permission.
    """
    stmt = (
        select(Announcement)
        .options(selectinload(Announcement.company), selectinload(Announcement.created_by))
        .where(Announcement.id == announcement_id)
    )
    announcement = await db.scalar(stmt)
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    if data.title is not None:
        announcement.title = data.title.strip()

    if data.content is not None:
        announcement.content = data.content.strip()

    if data.category is not None:
        announcement.category = _parse_category(data.category)
        if announcement.category == AnnouncementCategory.GENERAL:
            announcement.companyId = None

    if data.tags is not None:
        announcement.tags = [t.strip() for t in data.tags if t and t.strip()]

    # If companyId was explicitly supplied in request
    if "companyId" in data.model_fields_set:
        clean_company_id = data.companyId.strip() if data.companyId else None
        if announcement.category == AnnouncementCategory.GENERAL:
            announcement.companyId = None
        elif clean_company_id:
            company = await db.scalar(select(Company).where(Company.id == clean_company_id))
            if not company:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Company with ID '{clean_company_id}' does not exist.",
                )
            announcement.companyId = clean_company_id
        else:
            announcement.companyId = None

    await db.commit()

    # Re-fetch with relations
    saved = await db.scalar(stmt)
    return _to_announcement_response(saved)


@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    caller: dict = Depends(require_permission(PERM_ANNOUNCEMENTS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an announcement. Requires 'announcements:manage' permission.
    """
    announcement = await db.scalar(select(Announcement).where(Announcement.id == announcement_id))
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found.",
        )

    await db.delete(announcement)
    await db.commit()
    return {"success": True, "message": "Announcement deleted successfully."}

