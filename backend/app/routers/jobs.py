from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.dependencies import get_db, require_student
from app.models.db import JobProfile, JobStatus, User, Resume
from app.schemas.job import JobResponse
from app.services.eligibility import evaluate_eligibility, is_eligible

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("", response_model=list[JobResponse])
async def list_jobs(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    # Student sees ACTIVE or ENDED jobs, not DRAFT
    jobs = await db.scalars(
        select(JobProfile).where(JobProfile.status != JobStatus.DRAFT)
    )
    return jobs.all()

@router.get("/{job_id}")
async def get_job_detail(
    job_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    job = await db.scalar(select(JobProfile).where(JobProfile.id == job_id))
    if not job or job.status == JobStatus.DRAFT:
        raise HTTPException(status_code=404, detail="Job not found")
        
    user = await db.scalar(select(User).where(User.id == user_payload["sub"]))
    resumes_count = await db.scalar(select(func.count(Resume.id)).where(Resume.userId == user.id))
    
    # Calculate eligibility
    from app.services.eligibility import to_eligibility_profile
    profile = to_eligibility_profile(user, resumes_count or 0)
    
    eligibility_checks = []
    eligible = False
    
    if profile:
        eligibility_checks = evaluate_eligibility(
            cgpa=profile["cgpa"],
            batch=profile["batch"],
            branch=profile["branch"],
            backlogs=profile["backlogs"],
            bans=profile["bans"],
            documents_complete=profile["documents_complete"],
            min_cgpa=job.minCGPA,
            job_batch=job.batch,
            allowed_branches=job.allowedBranches,
            max_backlogs=job.maxBacklogs,
            max_bans=job.maxBans
        )
        eligible = is_eligible(eligibility_checks)

    return {
        "job": job,
        "eligibility": {
            "checks": eligibility_checks,
            "eligible": eligible,
            "profile_complete": bool(profile)
        }
    }
