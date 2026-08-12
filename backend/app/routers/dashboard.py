from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.dependencies import get_db, require_student
from app.models.db import Announcement, JobProfile, JobStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("")
async def get_dashboard(
    user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    # Fetch metrics for the student dashboard
    active_jobs = await db.scalar(
        select(func.count(JobProfile.id)).where(JobProfile.status == JobStatus.ACTIVE)
    )
    
    announcements = await db.scalars(
        select(Announcement).order_by(Announcement.createdAt.desc()).limit(5)
    )
    
    # Ideally, compute next deadline and eligible roles here
    return {
        "active_jobs": active_jobs or 0,
        "announcements": list(announcements.all()),
        "next_deadline": None,
        "eligible_roles": 0
    }
