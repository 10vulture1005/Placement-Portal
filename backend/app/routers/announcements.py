from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, require_student
from app.models.db import Announcement
from app.schemas.announcement import AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["announcements"])

@router.get("", response_model=list[AnnouncementResponse])
async def list_announcements(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    announcements = await db.scalars(
        select(Announcement).order_by(Announcement.createdAt.desc())
    )
    return announcements.all()
