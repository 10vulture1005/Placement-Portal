from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, require_student
from app.models.db import Application, ApplicationStatus, JobProfile, JobStatus
from app.schemas.application import ApplicationCreate, ApplicationResponse

router = APIRouter(prefix="/applications", tags=["applications"])

@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    apps = await db.scalars(select(Application).where(Application.userId == user_payload["sub"]))
    return apps.all()

@router.post("", response_model=ApplicationResponse)
async def apply_to_job(
    data: ApplicationCreate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    # Verify job is active
    job = await db.scalar(select(JobProfile).where(JobProfile.id == data.jobProfileId))
    if not job or job.status != JobStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Job is not active")
        
    # Check if already applied
    existing = await db.scalar(
        select(Application).where(
            Application.userId == user_payload["sub"], 
            Application.jobProfileId == data.jobProfileId
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")
        
    # Re-evaluate eligibility here before inserting...
    # (Simplified for now)
    
    import uuid
    app = Application(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        jobProfileId=data.jobProfileId,
        resumeId=data.resumeId,
        status=ApplicationStatus.APPLIED
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app

@router.patch("/{app_id}/withdraw")
async def withdraw_application(
    app_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    app = await db.scalar(select(Application).where(Application.id == app_id, Application.userId == user_payload["sub"]))
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app.status != ApplicationStatus.APPLIED:
        raise HTTPException(status_code=400, detail="Cannot withdraw once shortlisted/processed")
        
    app.status = ApplicationStatus.WITHDRAWN
    await db.commit()
    return {"message": "Application withdrawn"}
